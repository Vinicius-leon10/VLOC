# Ferramentas de arte

Monta a arte do jogo (`docs/arte/` e `docs/arte.js`) a partir das imagens
geradas no Gemini, que ficam em `arte-original/` (fundo magenta).

```bash
pip install pillow numpy opencv-python-headless
python3 ferramentas/montar.py ferramentas/arte-original docs/arte ferramentas
```

- `recorte.py`: remove o fundo magenta (a sombra vira preto translúcido) e
  separa as variações de cada imagem.
- `montar.py`: recorta a sala, escolhe a variação de cada móvel, define tamanho
  e ponto de apoio no piso, e monta o atlas do personagem com camadas de
  camiseta e cabelo para pintar no jogo.

## Estilos de cabelo

`gerar_cabelos.py` gera, pela API do Gemini, uma folha de 14 poses para cada
estilo de cabelo listado em `prompts-cabelos.md`, usando `personagem.jpg` como
modelo, e salva em `arte-original/cabelo_*.png`. Ele lê a chave da variável de
ambiente `GEMINI_API_KEY` (configure nas opções do ambiente, nunca no código).

```bash
python3 ferramentas/gerar_cabelos.py                    # todos os que faltam
python3 ferramentas/gerar_cabelos.py cabelo_pompadour    # só um
python3 ferramentas/montar.py ferramentas/arte-original docs/arte ferramentas
```

Cada folha `cabelo_*` com 14 poses vira um estilo no jogo e aparece na escolha
de "Estilo" da tela de entrada. Folhas com outro número de poses são ignoradas
com um aviso; nesse caso, gere de novo.

## Trocar um item

Para trocar um item, gere a imagem nova com os prompts de `prompts-arte.md`,
substitua o arquivo em `arte-original/` e rode o comando acima.
