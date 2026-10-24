# Prompts de arte do VLOC Hotel

Prompts para gerar cada item do jogo em outra IA de imagem (ChatGPT, Gemini,
Midjourney etc.), no mesmo estilo da imagem de referência da sala.

## Como usar

1. **Anexe a imagem de referência da sala** junto com cada prompt.
2. Gere **um item por vez**.
3. Cole o **Estilo base** no começo de todos os prompts, seguido do prompt do item.
4. Se a IA não fizer fundo transparente, ela deve usar fundo **magenta puro
   (#FF00FF)**, que eu removo depois.
5. Mande cada imagem pronta com o nome do item (por exemplo, `sofa`).

Os prompts estão em inglês porque as IAs de imagem costumam seguir as
instruções com mais precisão.

---

## 0. Estilo base (cole no começo de todos os prompts)

```
Game asset for an isometric 2.5D virtual hotel game. Match EXACTLY the art style, camera angle, lighting and colors of the attached reference image: soft stylized 3D render, warm lighting, clean details, slightly glossy materials. Isometric camera (2:1 dimetric, about 30° from above), viewed from the front corner like the reference. Single object only, centered, full object visible, nothing cropped. Transparent background (if not possible, solid pure magenta #FF00FF background). No floor, no walls, no text, no extra objects. Only a soft contact shadow directly under the object. High resolution, PNG.
```

## 1. Sala vazia (fundo do jogo)

```
The exact same room as the attached reference image, same size, camera and lighting, but COMPLETELY EMPTY: only the beige glossy tiled floor with its thick base, the two light gray-blue walls with white top trim and baseboards, the wooden door on the left wall, and the window with red curtains on the curtain rod on the right wall. No furniture, no rug, no plants, no lamp, no characters, no text. Dark charcoal background around the room.
```

## 2. Sofá

```
A red leather two-seater sofa with two seat cushions, two back cushions, rounded armrests and short dark wooden legs, same model as in the reference image, facing the viewer diagonally like in the reference.
```

## 3. Mesa

```
A dark brown wooden square table with four sturdy legs and a small clear glass vase with pink and red flowers on top, same as the reference image.
```

## 4. Banquinho

```
A small dark brown wooden stool with a square seat and four legs, same wood as the table in the reference image.
```

## 5. Estante

```
A tall narrow dark wooden bookshelf with 4 shelves full of colorful books (red, blue, yellow, green), same as in the reference image, back side against a wall.
```

## 6. Planta

```
A green leafy indoor plant with pointed leaves in a square wooden planter box with plank details, same as the reference image.
```

## 7. Luminária

```
A tall floor lamp with a black square base, thin black pole and a glowing cream tapered square lampshade, turned on with a warm soft glow, same as the reference image.
```

## 8. Tapete

```
A rectangular navy blue rug with a thin white inner border line and a beige/tan rectangle in the center, lying flat on the floor, seen at the same isometric angle as in the reference image.
```

## 9. Personagem (todas as poses numa imagem só)

Gerar tudo numa imagem só ajuda o personagem a sair igual em todas as poses.

```
Character sprite sheet for the same game, same style as the cartoon man in the reference image: stylized 3D cartoon young man, short dark brown hair, big expressive eyes, WHITE long-sleeve shirt (so it can be recolored in game), dark blue jeans, brown shoes. Same character, same size and same proportions in every pose, arranged in a grid with plenty of space between them, each pose fully visible:
Row 1: standing idle facing front-left, standing idle facing back-right (seen from behind).
Row 2: 4 walking frames facing front-left (left foot forward, passing, right foot forward, passing).
Row 3: 4 walking frames facing back-right.
Row 4: waving with the right hand facing front-left (2 frames), dancing (2 frames, arms up).
Isometric camera like the reference. Transparent background (or solid pure magenta #FF00FF). No text, no labels, no floor.
```

---

## Dicas

- Se um item vier com ângulo ou iluminação diferente, peça: *"mesmo ângulo e
  iluminação da imagem de referência, só o objeto"*.
- O personagem é o mais difícil de sair consistente. Se a folha de poses vier
  bagunçada, gere só as **2 poses paradas** (de frente e de costas); a animação
  de andar é feita no jogo a partir delas.
- A camiseta branca é de propósito: no jogo ela é pintada com a cor que cada
  pessoa escolher.
