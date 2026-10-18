# Mini hotel

Hotel isométrico simples feito do zero: sala com móveis, andar por clique,
balões de chat e entrada com senha. Sem framework, sem assets externos.

```bash
cd mini-hotel
npm install
SENHA=minhasenha npm start
```

Abra http://localhost:3000 (senha padrão: `amigos`).

- `server.js`: servidor HTTP + WebSocket, caminho (BFS) e movimento por ticks
- `public/game.js`: renderização isométrica em Canvas, interpolação e chat
