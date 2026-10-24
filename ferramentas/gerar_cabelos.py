# Gera as folhas de poses de cada estilo de cabelo pela API do Gemini, usando a
# folha atual do personagem como modelo. Lê a chave da variável GEMINI_API_KEY.
#
# Uso: python3 ferramentas/gerar_cabelos.py [estilo ...]
#      (sem argumentos, gera todos os que ainda não existem em arte-original/)
import base64, json, os, sys, time, urllib.request
from pathlib import Path

PASTA = Path(__file__).parent / 'arte-original'
MODELO = os.environ.get('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image')

MASCULINO = (
    'Character sprite sheet for an isometric 2.5D virtual hotel game. Use the attached sprite sheet as an EXACT template: '
    'same character, same face, same body, same white long-sleeve shirt, dark blue jeans and brown shoes, same art style and '
    'lighting, same 14 poses in the same positions, same size and same spacing. Change ONLY the hairstyle, identically in every '
    'pose, seen correctly from the front and from behind: {estilo}, dark brown color. Solid pure magenta #FF00FF background. '
    'No text, no labels, no floor, no extra objects. High resolution, PNG.'
)
FEMININO = (
    'Character sprite sheet for an isometric 2.5D virtual hotel game. Use the attached sprite sheet as an EXACT template for the '
    'art style, lighting, the 14 poses, their positions, size and spacing, but make the character a young WOMAN: feminine face '
    'with the same cartoon style, slightly slimmer body, same white long-sleeve shirt, dark blue jeans and brown shoes. The SAME '
    'woman in every pose, with this hairstyle identical in every pose, seen correctly from the front and from behind: {estilo}, '
    'dark brown color. Solid pure magenta #FF00FF background. No text, no labels, no floor, no extra objects. High resolution, PNG.'
)

ESTILOS = {
    'cabelo_curto_despenteado': (MASCULINO, 'short textured messy crop hair with faded sides'),
    'cabelo_pompadour': (MASCULINO, 'voluminous modern pompadour combed back with skin fade on the sides'),
    'cabelo_encaracolado': (MASCULINO, 'short curly hair with tight, bouncy curls all around'),
    'cabelo_medio_ondulado': (MASCULINO, 'medium-length wavy messy hair with bangs falling over the forehead'),
    'cabelo_classico': (MASCULINO, 'classic slicked side-part hair, neat and combed to the side with a clean shine'),
    'cabelo_feminino_longo_ondulado': (FEMININO, 'long wavy loose hair falling over the shoulders'),
    'cabelo_feminino_rabo_cavalo': (FEMININO, 'high ponytail tied with a band, smooth volume on top'),
    'cabelo_feminino_bob': (FEMININO, 'sleek modern chin-length bob haircut with a neat side fringe'),
    'cabelo_feminino_coque': (FEMININO, 'casual messy topknot bun with a few loose strands framing the face'),
    'cabelo_feminino_tranca': (FEMININO, 'detailed side braid resting over the shoulder'),
}


def gerar(nome, chave):
    modelo_txt, estilo = ESTILOS[nome]
    folha = base64.b64encode((PASTA / 'personagem.jpg').read_bytes()).decode()
    corpo = {
        'contents': [{'parts': [
            {'text': modelo_txt.format(estilo=estilo)},
            {'inline_data': {'mime_type': 'image/jpeg', 'data': folha}},
        ]}],
        'generationConfig': {'responseModalities': ['IMAGE']},
    }
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent',
        data=json.dumps(corpo).encode(),
        headers={'Content-Type': 'application/json', 'x-goog-api-key': chave},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        resp = json.load(r)
    for parte in resp.get('candidates', [{}])[0].get('content', {}).get('parts', []):
        dados = parte.get('inline_data') or parte.get('inlineData')
        if dados:
            destino = PASTA / f'{nome}.png'
            destino.write_bytes(base64.b64decode(dados['data']))
            return destino
    raise RuntimeError(f'resposta sem imagem: {json.dumps(resp)[:400]}')


if __name__ == '__main__':
    chave = os.environ.get('GEMINI_API_KEY')
    if not chave:
        sys.exit('Defina GEMINI_API_KEY no ambiente (configurações do ambiente na nuvem).')
    nomes = sys.argv[1:] or [n for n in ESTILOS if not any(PASTA.glob(f'{n}.*'))]
    for nome in nomes:
        print(f'Gerando {nome}...', flush=True)
        try:
            print('  salvo em', gerar(nome, chave))
        except Exception as e:  # segue para o próximo estilo
            print('  falhou:', e)
        time.sleep(2)
