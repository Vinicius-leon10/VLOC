// Mini hotel: servidor HTTP estático + WebSocket para salas em tempo real.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.SENHA || 'amigos';
const TICK_MS = 280;

// Mapa da sala: 0 = chão livre, 1 = móvel (bloqueado). Linhas = y, colunas = x.
const ROOM_W = 10;
const ROOM_H = 10;
const FURNITURE = [
  { type: 'sofa', x: 1, y: 0 },
  { type: 'sofa', x: 2, y: 0 },
  { type: 'table', x: 5, y: 4 },
  { type: 'plant', x: 9, y: 0 },
  { type: 'plant', x: 0, y: 9 },
  { type: 'lamp', x: 9, y: 9 },
];
const blocked = new Set(FURNITURE.map((f) => `${f.x},${f.y}`));
const SPAWN = { x: 4, y: 8 };

const players = new Map(); // id -> { id, name, color, x, y, path: [] }
let nextId = 1;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(__dirname, 'public', path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('Não encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1 && client.playerId) client.send(data);
  }
}

function isFree(x, y) {
  return x >= 0 && y >= 0 && x < ROOM_W && y < ROOM_H && !blocked.has(`${x},${y}`);
}

// Busca em largura com 8 direções; retorna os passos sem incluir a origem.
function findPath(from, to) {
  if (!isFree(to.x, to.y)) return [];
  const key = (p) => `${p.x},${p.y}`;
  const prev = new Map([[key(from), null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) break;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const next = { x: cur.x + dx, y: cur.y + dy };
        if (!isFree(next.x, next.y) || prev.has(key(next))) continue;
        // Não corta quinas de móveis na diagonal.
        if (dx && dy && (!isFree(cur.x + dx, cur.y) || !isFree(cur.x, cur.y + dy))) continue;
        prev.set(key(next), cur);
        queue.push(next);
      }
    }
  }
  if (!prev.has(key(to))) return [];
  const steps = [];
  for (let p = to; p && key(p) !== key(from); p = prev.get(key(p))) steps.unshift(p);
  return steps;
}

function publicPlayer(p) {
  return { id: p.id, name: p.name, color: p.color, x: p.x, y: p.y };
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join' && !ws.playerId) {
      if (msg.password !== PASSWORD) {
        ws.send(JSON.stringify({ type: 'error', message: 'Senha incorreta' }));
        return;
      }
      const name = String(msg.name || '').trim().slice(0, 16) || 'Visitante';
      const color = /^#[0-9a-f]{6}$/i.test(msg.color) ? msg.color : '#e94560';
      const player = { id: nextId++, name, color, ...SPAWN, path: [] };
      players.set(player.id, player);
      ws.playerId = player.id;
      ws.send(JSON.stringify({
        type: 'welcome',
        you: player.id,
        room: { w: ROOM_W, h: ROOM_H, furniture: FURNITURE },
        players: [...players.values()].map(publicPlayer),
      }));
      broadcast({ type: 'joined', player: publicPlayer(player) });
      return;
    }

    const player = players.get(ws.playerId);
    if (!player) return;

    if (msg.type === 'move') {
      player.path = findPath(player, { x: msg.x | 0, y: msg.y | 0 });
    } else if (msg.type === 'chat') {
      const text = String(msg.text || '').trim().slice(0, 120);
      if (text) broadcast({ type: 'chat', id: player.id, text });
    }
  });

  ws.on('close', () => {
    if (!ws.playerId) return;
    players.delete(ws.playerId);
    broadcast({ type: 'left', id: ws.playerId });
  });
});

// Avança cada jogador um quadrado por tick.
setInterval(() => {
  const moves = [];
  for (const p of players.values()) {
    const step = p.path.shift();
    if (!step) continue;
    p.x = step.x;
    p.y = step.y;
    moves.push({ id: p.id, x: p.x, y: p.y });
  }
  if (moves.length) broadcast({ type: 'moves', moves });
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Hotel aberto em http://localhost:${PORT} (senha: ${PASSWORD})`);
});
