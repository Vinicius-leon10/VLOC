# Gera docs/arte/*: fundo da sala, sprites dos móveis e atlas do personagem, mais docs/arte.js com as medidas.
import json, sys, numpy as np, cv2
from PIL import Image
sys.path.insert(0, sys.argv[3])
from recorte import remover_magenta, componentes

ENTRADA, SAIDA = sys.argv[1], sys.argv[2]  # ex.: ferramentas/arte-original docs/arte
K = 0.75                 # escala da sala (imagem original -> mundo do jogo)
CORTE = (505, 0, 2075, 1310)
# Cantos do piso medidos na imagem original da sala.
CANTOS = {'B': (1290, 370), 'R': (2050, 822), 'F': (1290, 1287), 'L': (528, 822)}
TILE_DY = (822 - 370) / 10 * K  # altura de meio ladrilho no mundo (~33.9)
TILE_DX = (2050 - 1290) / 10 * K  # (~57)
DENS = 1.6               # pixels do sprite por pixel do mundo (nitidez em telas retina)

meta = {}

# ---------- Sala ----------
sala = Image.open(f'{ENTRADA}/sala.jpg').convert('RGB').crop(CORTE)
sala = sala.resize((round(sala.width * K), round(sala.height * K)), Image.LANCZOS)
# Deixa o fundo em volta da sala numa cor lisa, para emendar com o fundo do jogo.
FUNDO = np.array([0x1f, 0x22, 0x37], np.float32)
arr = np.asarray(sala).astype(np.float32)
hsv = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2HSV)
eh_fundo = (hsv[..., 2] < 75) & (arr[..., 2] > arr[..., 0])
n, lab, st, _ = cv2.connectedComponentsWithStats(eh_fundo.astype(np.uint8))
borda = np.zeros_like(eh_fundo)
for i in range(1, n):
    x, y, w, h, area = st[i]
    if x == 0 or y == 0 or x + w >= arr.shape[1] or y + h >= arr.shape[0]:
        borda |= lab == i
peso = cv2.GaussianBlur(borda.astype(np.float32), (9, 9), 0)[..., None]
arr = arr * (1 - peso) + FUNDO * peso
sala = Image.fromarray(arr.astype(np.uint8))
sala.save(f'{SAIDA}/sala.jpg', quality=86)
meta['sala'] = {'w': sala.width, 'h': sala.height,
                'cantos': {k: [round((x - CORTE[0]) * K, 1), round((y - CORTE[1]) * K, 1)] for k, (x, y) in CANTOS.items()}}

# ---------- Móveis ----------
def recorta(nome, indice, espelhar=False):
    rgba = remover_magenta(f'{ENTRADA}/{nome}.jpg')
    x, y, w, h = componentes(rgba)[indice]
    m = 30
    crop = rgba[max(0, y - m):y + h + m, max(0, x - m):x + w + m]
    img = Image.fromarray(crop)
    if espelhar:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img

def apara(img):
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > 8)
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

# nome, arquivo, variação, espelhar, largura no mundo, pegada (ex, ey em ladrilhos)
MOVEIS = [
    ('sofa', 'sofa', 0, True, 182, (2.0, 0.85)),
    ('estante', 'estante', 0, False, 104, (0.95, 0.45)),
    ('mesa', 'mesa', 2, False, 108, (0.95, 0.95)),
    ('banco', 'banco', 0, False, 56, (0.5, 0.5)),
    ('planta', 'planta', 1, False, 104, (0.6, 0.6)),
    ('luminaria', 'luminaria', 0, False, 70, (0.38, 0.38)),
]
for nome, arq, idx, esp, largura, (ex, ey) in MOVEIS:
    img = apara(recorta(arq, idx, esp))
    a = np.asarray(img)[..., 3]
    solido = a > 200
    fundo_y = np.where(solido.any(1))[0].max()
    # x do ponto mais baixo (canto da frente da pegada)
    linhas = solido[max(0, fundo_y - 6):fundo_y + 1]
    xs = np.where(linhas.any(0))[0]
    base_x = xs.mean()
    px_por_mundo = img.width / largura
    # Centro da pegada: acima do canto da frente, deslocado se a pegada não for quadrada.
    # A caixa envolvente de um móvel isométrico fica centrada na pegada.
    ax = img.width / 2
    ay = fundo_y - (ex + ey) / 2 * TILE_DY * px_por_mundo
    alvo_w = round(largura * DENS)
    f = alvo_w / img.width
    img = img.resize((alvo_w, round(img.height * f)), Image.LANCZOS)
    img.save(f'{SAIDA}/{nome}.png', optimize=True)
    meta[nome] = {'w': largura, 'h': round(img.height / DENS, 1), 'ax': round(ax / px_por_mundo, 1), 'ay': round(ay / px_por_mundo, 1)}

# ---------- Personagem ----------
rgba = remover_magenta(f'{ENTRADA}/personagem.jpg')
caixas = componentes(rgba)
assert len(caixas) == 14, len(caixas)
ALTURA = 230  # px do sprite (desenhado com ~145 px de altura no mundo)
quadros = []
for (x, y, w, h) in caixas:
    m = 20
    c = rgba[max(0, y - m):y + h + m, max(0, x - m):x + w + m].copy()
    # Mantém só o personagem (tira borrões soltos da imagem gerada).
    a = (c[..., 3] > 20).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(a, np.ones((9, 9), np.uint8)))
    maior = 1 + np.argmax(st[1:, 4])
    c[..., 3][lab != maior] = 0
    # Sombra translúcida só pode existir na altura dos pés.
    yy = np.arange(c.shape[0])[:, None] / c.shape[0]
    c[..., 3][(c[..., 3] < 200) & (yy < 0.85)] = 0
    quadros.append(c)
esc = ALTURA / max(q.shape[0] for q in quadros)

def camadas(c):
    rgb = c[..., :3].astype(np.float32) / 255
    alpha = c[..., 3].astype(np.float32) / 255
    hsv = cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    h, s, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    H = c.shape[0]
    yy = np.arange(H)[:, None] / H
    def maior_regioes(mask, min_px):
        n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8))
        out = np.zeros_like(mask)
        for i in range(1, n):
            if st[i, 4] >= min_px:
                out |= lab == i
        return out
    camisa = (s < 0.2) & (v > 0.5) & (alpha > 0.5)
    camisa = maior_regioes(camisa, 600)
    cabelo = (h < 45) & (s > 0.2) & (v < 0.42) & (yy < 0.42) & (alpha > 0.5)
    cabelo = maior_regioes(cabelo, 80)
    def camada(mask, alvo):
        mk = cv2.GaussianBlur(mask.astype(np.float32), (3, 3), 0)
        l = lum.copy()
        media = l[mask].mean() if mask.any() else 1
        l = np.clip(l * (alvo / media), 0, 1)
        out = np.dstack([l, l, l, mk * alpha]) * 255
        return out.astype(np.uint8)
    return camada(camisa, 0.88), camada(cabelo, 0.82)

atlas_w = 0
info = []
redim = []
for c in quadros:
    img = Image.fromarray(c)
    img = img.resize((round(img.width * esc), round(img.height * esc)), Image.LANCZOS)
    arr = np.asarray(img)
    cam, cab = camadas(arr)
    redim.append((arr, cam, cab))
    a = arr[..., 3] > 200
    fy = np.where(a.any(1))[0].max()
    xs = np.where(a[max(0, fy - 25):fy + 1].any(0))[0]
    info.append({'x': atlas_w, 'w': img.width, 'h': img.height, 'ax': round((xs.min() + xs.max()) / 2), 'ay': int(fy) - 4})
    atlas_w += img.width + 2
atlas_h = max(i['h'] for i in info)
for k, nome in enumerate(['avatar', 'avatar-camisa', 'avatar-cabelo']):
    at = Image.new('RGBA', (atlas_w, atlas_h), (0, 0, 0, 0))
    for (arr, cam, cab), i in zip(redim, info):
        at.paste(Image.fromarray([arr, cam, cab][k]), (i['x'], 0))
    at.save(f'{SAIDA}/{nome}.png', optimize=True)
meta['avatar'] = {'quadros': info, 'altura': 145, 'px': ALTURA,
                  # orientação nativa dos quadros: de frente e de costas olham para a direita
                  'parado': 0, 'paradoCostas': 2, 'andar': [3, 4, 5, 6], 'andarCostas': [7, 8, 9, 10],
                  'acenar': [11], 'dancar': [12, 13]}

with open(f'{SAIDA}/../arte.js', 'w') as fo:
    fo.write('// Medidas da arte (gerado por scripts de montagem; não editar à mão).\n')
    fo.write('const ARTE = ' + json.dumps(meta, indent=1) + ';\n')
print(json.dumps({k: v for k, v in meta.items() if k != 'avatar'}, indent=1))
