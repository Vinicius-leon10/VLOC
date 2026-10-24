# Prompts de cabelos do VLOC Hotel

O boneco do jogo usa 14 poses (parado, andando de frente e de costas, acenando
e dançando). Para um estilo de cabelo funcionar na animação, cada estilo
precisa de uma **folha completa de poses**, igual à do personagem atual, e não
só da cabeça.

## Como usar

1. **Anexe a folha atual do personagem** (a de camiseta branca, com as 14
   poses) junto com cada prompt.
2. Cole o **Modelo** (masculino ou feminino) e troque `[ESTILO]` pela linha do
   estilo que quer gerar.
3. Gere **um estilo por vez**.
4. Mande cada imagem com o nome do arquivo indicado (por exemplo,
   `cabelo_pompadour`).

O cabelo sai castanho-escuro de propósito: no jogo ele é pintado com a cor que
cada pessoa escolher. A camiseta branca também.

---

## Modelo masculino

```
Character sprite sheet for an isometric 2.5D virtual hotel game. Use the attached sprite sheet as an EXACT template: same character, same face, same body, same white long-sleeve shirt, dark blue jeans and brown shoes, same art style and lighting, same 14 poses in the same positions, same size and same spacing. Change ONLY the hairstyle, identically in every pose, seen correctly from the front and from behind: [ESTILO], dark brown color. Solid pure magenta #FF00FF background. No text, no labels, no floor, no extra objects. High resolution, PNG.
```

| Arquivo | Estilo | Troque `[ESTILO]` por |
|---|---|---|
| `cabelo_curto_despenteado` | Curto despenteado | `short textured messy crop hair with faded sides` |
| `cabelo_pompadour` | Pompadour | `voluminous modern pompadour combed back with skin fade on the sides` |
| `cabelo_encaracolado` | Encaracolado | `short curly hair with tight, bouncy curls all around` |
| `cabelo_medio_ondulado` | Médio ondulado | `medium-length wavy messy hair with bangs falling over the forehead` |
| `cabelo_classico` | Clássico com risca | `classic slicked side-part hair, neat and combed to the side with a clean shine` |

## Modelo feminino

```
Character sprite sheet for an isometric 2.5D virtual hotel game. Use the attached sprite sheet as an EXACT template for the art style, lighting, the 14 poses, their positions, size and spacing, but make the character a young WOMAN: feminine face with the same cartoon style, slightly slimmer body, same white long-sleeve shirt, dark blue jeans and brown shoes. The SAME woman in every pose, with this hairstyle identical in every pose, seen correctly from the front and from behind: [ESTILO], dark brown color. Solid pure magenta #FF00FF background. No text, no labels, no floor, no extra objects. High resolution, PNG.
```

| Arquivo | Estilo | Troque `[ESTILO]` por |
|---|---|---|
| `cabelo_feminino_longo_ondulado` | Longo ondulado | `long wavy loose hair falling over the shoulders` |
| `cabelo_feminino_rabo_cavalo` | Rabo de cavalo | `high ponytail tied with a band, smooth volume on top` |
| `cabelo_feminino_bob` | Bob moderno | `sleek modern chin-length bob haircut with a neat side fringe` |
| `cabelo_feminino_coque` | Coque | `casual messy topknot bun with a few loose strands framing the face` |
| `cabelo_feminino_tranca` | Trança lateral | `detailed side braid resting over the shoulder` |

---

## Dicas

- Confira se vieram **14 poses** na mesma ordem da folha original. Se faltar
  alguma ou vier fora de ordem, peça: *"same 14 poses in the same order as the
  attached sheet"*.
- Se o rosto ou a roupa mudarem, peça: *"keep everything identical to the
  attached sheet except the hair"*.
- Para as personagens femininas, vale gerar primeiro uma folha só com o corpo
  feminino e depois usar essa folha como modelo para os 5 cabelos. Assim, a
  mesma moça aparece em todos os estilos.
