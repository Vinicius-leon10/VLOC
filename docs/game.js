// Jogo: desenha a sala isométrica, os avatares e os balões de chat.
const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');
const TILE_W = 64;
const TILE_H = 32;
const WALL_H = 128;

let sala = null; // conexão da rede (rede.js)
const myId = Math.random().toString(36).slice(2, 10);
let me = null;
const players = new Map(); // id -> { name, color, hair, x, y, path, acao, drawX, drawY, seen }
let origin = { x: 0, y: 0 };
let scale = 1;
let hover = null;
// Chat no estilo Habbo: balões sobem juntos pela tela a cada mensagem.
const CHAT_ROW_H = 26;
const CHAT_SCROLL_MS = 4000;
let chatLines = []; // { x, name, color, hair, text, row }
let chatTop = 40;
let lastScroll = 0;

// ---------- Sala ----------
const TICK_MS = 280;
const HEARTBEAT_MS = 5000;
const TIMEOUT_MS = 16000;
const room = {
  w: 10,
  h: 10,
  furniture: [
    { type: 'rug', x: 4, y: 3, w: 3, h: 3 }, // decoração, não bloqueia
    { type: 'sofa', x: 1, y: 0, w: 2 },
    { type: 'shelf', x: 7, y: 0 },
    { type: 'table', x: 5, y: 4 },
    { type: 'stool', x: 4, y: 4 },
    { type: 'stool', x: 6, y: 4 },
    { type: 'plant', x: 9, y: 0 },
    { type: 'plant', x: 0, y: 9 },
    { type: 'lamp', x: 9, y: 9 },
  ],
};
const blocked = new Set();
for (const f of room.furniture) {
  if (f.type === 'rug') continue;
  for (let i = 0; i < (f.w || 1); i++) blocked.add(`${f.x + i},${f.y}`);
}

function isFree(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < room.w && y < room.h && !blocked.has(`${x},${y}`);
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
  for (let p = to; p && key(p) !== key(from); p = prev.get(key(p))) steps.unshift({ x: p.x, y: p.y });
  return steps;
}

// Avança cada jogador um quadrado por tick (todos os navegadores fazem a mesma conta).
setInterval(() => {
  for (const p of players.values()) {
    const step = p.path.shift();
    if (!step) continue;
    // Direção na tela: x-y é horizontal (direita +), x+y é vertical (frente +).
    const h = step.x - p.x - (step.y - p.y);
    const v = step.x - p.x + (step.y - p.y);
    if (h) p.right = h > 0;
    if (v) p.front = v > 0;
    Object.assign(p, step);
  }
}, TICK_MS);

// ---------- Rede ----------
function myState() {
  return { name: me.name, color: me.color, hair: me.hair, x: me.x, y: me.y, path: me.path, acao: me.acao };
}

// Dados vindos de outros jogadores: valida antes de usar.
function upsertPlayer(id, d) {
  if (typeof id !== 'string' || id.length > 20) return null;
  const pos = isFree(d.x, d.y) ? { x: d.x, y: d.y } : { x: 4, y: 8 };
  const path = Array.isArray(d.path) ? d.path.slice(0, 40).filter((s) => isFree(s?.x, s?.y)).map((s) => ({ x: s.x, y: s.y })) : [];
  let p = players.get(id);
  if (!p) {
    p = { id, drawX: pos.x, drawY: pos.y, front: true, right: false, fase: Math.random() * 5000 };
    players.set(id, p);
  }
  Object.assign(p, {
    name: String(d.name || 'Visitante').slice(0, 16),
    color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#888888',
    hair: /^#[0-9a-f]{6}$/i.test(d.hair) ? d.hair : '#4a2f1d',
    ...pos,
    path,
    seen: Date.now(),
  });
  // Dançar continua até a pessoa parar; acenar chega só pela mensagem 'acao'.
  if (d.acao === 'dancar') p.acao = 'dancar';
  else if (p.acao === 'dancar') p.acao = null;
  updateOnline();
  return p;
}

function handle(msg) {
  switch (msg.type) {
    case 'hello':
      upsertPlayer(msg.id, msg);
      // Responde com um atraso aleatório para não chegarem todas juntas.
      setTimeout(() => sala.enviar({ type: 'state', ...myState() }), 100 + Math.random() * 500);
      break;
    case 'state':
    case 'move':
      upsertPlayer(msg.id, msg);
      break;
    case 'acao': {
      const p = players.get(msg.id);
      if (p) setAcao(p, msg.acao);
      break;
    }
    case 'chat': {
      const p = players.get(msg.id);
      const text = String(msg.text || '').trim().slice(0, 120);
      if (!p || !text) break;
      p.seen = Date.now();
      chatLines.forEach((l) => l.row++);
      chatLines.push({ x: toScreen(p.drawX, p.drawY).x, name: p.name, color: p.color, hair: p.hair, text, row: 0 });
      lastScroll = performance.now();
      break;
    }
    case 'bye':
      players.delete(msg.id);
      updateOnline();
      break;
  }
}

function setStatus(online) {
  const el = document.getElementById('status');
  el.textContent = online ? '' : 'Conectando...';
  el.style.display = online ? 'none' : 'block';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('nome').value.trim().slice(0, 16) || 'Visitante';
  const color = document.getElementById('cor').value;
  const hair = document.getElementById('cabelo').value;
  const senha = document.getElementById('senha').value;
  try {
    localStorage.setItem('vloc', JSON.stringify({ name, color, hair, senha }));
  } catch {}
  // Nasce num quadrado livre perto da porta.
  const x = 2 + Math.floor(Math.random() * 6);
  const y = 7 + Math.floor(Math.random() * 3);
  me = { id: myId, name, color, hair, x, y, path: [], acao: null, drawX: x, drawY: y, front: true, right: false, fase: 0, seen: Infinity };
  players.set(myId, me);

  document.getElementById('login').style.display = 'none';
  document.getElementById('chat').style.display = 'flex';
  document.getElementById('online').style.display = 'flex';
  updateOnline();
  resize();
  setStatus(false);

  let saudou = false;
  sala = await conectarSala(senha, myId, handle, (online) => {
    setStatus(online);
    if (online && !saudou) {
      saudou = true;
      sala.enviar({ type: 'hello', ...myState() });
    }
  });
  setInterval(() => {
    sala.enviar({ type: 'state', ...myState() });
    const limite = Date.now() - TIMEOUT_MS;
    for (const [id, p] of players) if (p.seen < limite) players.delete(id);
    updateOnline();
  }, HEARTBEAT_MS);
  addEventListener('pagehide', () => sala.sair());
});

// Lembra nome, cor e senha neste aparelho.
try {
  const salvo = JSON.parse(localStorage.getItem('vloc') || 'null');
  if (salvo) {
    document.getElementById('nome').value = salvo.name;
    document.getElementById('cor').value = salvo.color;
    if (salvo.hair) document.getElementById('cabelo').value = salvo.hair;
    document.getElementById('senha').value = salvo.senha;
  }
} catch {}

function updateOnline() {
  const names = [...players.values()].map((p) => p.name).join(', ');
  document.getElementById('online-n').textContent = players.size;
  document.getElementById('online-nomes').textContent = names;
}

document.getElementById('chat').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('msg');
  const text = input.value.trim().slice(0, 120);
  input.value = '';
  if (!text || !sala) return;
  sala.enviar({ type: 'chat', text });
  handle({ type: 'chat', id: myId, text });
});

// ---------- Coordenadas ----------
function toScreen(x, y) {
  return { x: origin.x + (x - y) * (TILE_W / 2), y: origin.y + (x + y) * (TILE_H / 2) };
}

function toTile(sx, sy) {
  const dx = (sx - origin.x) / (TILE_W / 2);
  const dy = (sy - origin.y) / (TILE_H / 2);
  return { x: Math.floor((dx + dy) / 2 + 0.5), y: Math.floor((dy - dx) / 2 + 0.5) };
}

function inRoom(t) {
  return room && t.x >= 0 && t.y >= 0 && t.x < room.w && t.y < room.h;
}

function pointerTile(e) {
  const r = canvas.getBoundingClientRect();
  return toTile((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
}

canvas.addEventListener('pointermove', (e) => {
  const t = pointerTile(e);
  hover = inRoom(t) ? t : null;
});

canvas.addEventListener('pointerdown', (e) => {
  const t = pointerTile(e);
  if (!me || !inRoom(t)) return;
  me.path = findPath({ x: me.x, y: me.y }, t);
  me.acao = null;
  sala?.enviar({ type: 'move', ...myState() });
});

// Ajusta o zoom para a sala inteira caber na tela (inclusive no celular).
function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  const w = room ? room.w : 10;
  const h = room ? room.h : 10;
  const roomW = ((w + h) * TILE_W) / 2;
  const roomH = ((w + h) * TILE_H) / 2 + WALL_H + 30;
  scale = Math.min(1.3, (innerWidth - 16) / roomW, (innerHeight - 70) / roomH);
  ctx.setTransform(devicePixelRatio * scale, 0, 0, devicePixelRatio * scale, 0, 0);
  // Centraliza a sala; (w - h) desloca quando ela não é quadrada.
  origin = {
    x: innerWidth / scale / 2 + ((h - w) * TILE_W) / 4,
    y: (innerHeight / scale - 70 / scale - roomH) / 2 + WALL_H + 30,
  };
  chatTop = 40 / scale;
}
addEventListener('resize', resize);

// ---------- Ações (acenar e dançar) ----------
function setAcao(p, acao) {
  p.acao = acao === 'acenar' || acao === 'dancar' ? acao : null;
  p.acaoAte = performance.now() + 2500;
}

for (const btn of document.querySelectorAll('[data-acao]')) {
  btn.addEventListener('click', () => {
    if (!me) return;
    // Tocar de novo em dançar faz parar.
    const acao = btn.dataset.acao === 'dancar' && me.acao === 'dancar' ? null : btn.dataset.acao;
    setAcao(me, acao);
    sala?.enviar({ type: 'acao', acao });
  });
}

// Prévia do avatar na tela de entrada.
function desenharPrevia() {
  const c = document.getElementById('previa');
  if (!c || !c.getContext) return;
  const g = c.getContext('2d');
  const dpr = devicePixelRatio || 1;
  c.width = 112 * dpr;
  c.height = 136 * dpr;
  g.setTransform(dpr * 1.6, 0, 0, dpr * 1.6, 0, 0);
  g.clearRect(0, 0, 70, 85);
  drawAvatar(g, 34, 78, {
    shirt: document.getElementById('cor').value,
    hair: document.getElementById('cabelo').value,
    front: true,
    right: false,
    acao: 'acenar',
    t: performance.now(),
  });
  if (!me) requestAnimationFrame(desenharPrevia);
}

resize();
requestAnimationFrame(frame);
requestAnimationFrame(desenharPrevia);
