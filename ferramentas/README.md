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

Para trocar um item, gere a imagem nova com os prompts de `prompts-arte.md`,
substitua o arquivo em `arte-original/` e rode o comando acima.
