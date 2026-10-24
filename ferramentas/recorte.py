# Remove o fundo magenta (mantendo a sombra como preto translúcido) e separa os objetos.
import sys, numpy as np, cv2
from PIL import Image

def remover_magenta(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # "Magentice": quanto R e B superam G de forma parecida.
    m = np.minimum(r, b) - g
    eq = np.abs(r - b)
    fundo = (m > 150) & (eq < 60)
    sombra = (m > 40) & (eq < 70) & ~fundo & (g < 90)
    alpha = np.ones(r.shape, np.float32)
    alpha[fundo] = 0
    # Sombra sobre magenta: magenta escurecido vira preto translúcido.
    brilho = np.maximum(r, b) / 255.0
    alpha[sombra] = np.clip(1 - brilho[sombra], 0, 0.6)
    out = rgb.copy()
    out[sombra] = 0
    # Borda: tira o "vazamento" de magenta nos pixels de contorno.
    obj = (~fundo & ~sombra).astype(np.uint8)
    borda = obj - cv2.erode(obj, np.ones((5, 5), np.uint8))
    bb = borda.astype(bool)
    lim = np.minimum(out[..., 0], out[..., 2])
    excesso = np.clip(lim - out[..., 1] - 30, 0, None)
    for c in (0, 2):
        out[..., c][bb] -= excesso[bb] * 0.8
    alpha[bb] *= 0.92
    return np.dstack([np.clip(out, 0, 255), alpha * 255]).astype(np.uint8)

def componentes(rgba, min_area=4000):
    a = (rgba[..., 3] > 200).astype(np.uint8)
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(a)
    caixas = [tuple(stats[i][:4]) for i in range(1, n) if stats[i][4] >= min_area]
    return sorted(caixas, key=lambda c: (round(c[1] / 300), c[0]))

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    rgba = remover_magenta(src)
    Image.fromarray(rgba).save(dst)
    for c in componentes(rgba):
        print(c)
