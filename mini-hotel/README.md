# Mini hotel 🏨

Hotel isométrico pequeno, no estilo Habbo, que abre no navegador do iPhone
(ou de qualquer celular/computador). Sala com móveis, andar com um toque,
chat em balões que sobem pela tela e entrada com senha.

## Colocar no ar de graça (dá para fazer tudo pelo iPhone)

1. Crie uma conta em https://render.com entrando com o GitHub.
2. Abra https://render.com/deploy?repo=https://github.com/Vinicius-leon10/VLOC
   (se o repositório for privado, autorize o Render a acessá-lo).
3. Quando pedir `SENHA`, escolha a senha da sala e toque em **Apply / Deploy**.
4. Em uns 2 minutos o Render mostra um link como `https://vloc-hotel.onrender.com`.
   Mande o link e a senha para os amigos.

No iPhone, abra o link no Safari, toque em **Compartilhar → Adicionar à Tela de
Início**, e o hotel vira um ícone como um app.

> No plano grátis o servidor "dorme" depois de 15 min sem ninguém. O primeiro
> a entrar espera uns 50 segundos para ele acordar.

## Rodar no computador

```bash
cd mini-hotel
npm install
SENHA=minhasenha npm start
```

Abra http://localhost:3000 (senha padrão: `amigos`).

## Código

- `server.js`: servidor HTTP + WebSocket, caminho (BFS) e movimento por ticks
- `public/game.js`: renderização isométrica em Canvas, zoom automático para celular e chat
- `public/index.html`: login e ajustes para iPhone (tela cheia, ícone, teclado)
