// Jogo: desenha a sala isométrica, os avatares e os balões de chat.
const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');
const TILE_W = 64;
const TILE_H = 32;
const WALL_H = 110;

let sala = null; // conexão da rede (rede.js)
const myId = Math.random().toString(36).slice(2, 10);
let me = null;
const players = new Map(); // id -> { name, color, x, y, path, drawX, drawY, seen }
let origin = { x: 0, y: 0 };
let scale = 1;
let hover = null;
// Chat no estilo Habbo: balões sobem juntos pela tela a cada mensagem.
const CHAT_ROW_H = 26;
const CHAT_SCROLL_MS = 4000;
let chatLines = []; // { x, name, color, text, row }
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
    { type: 'sofa', x: 1, y: 0 },
    { type: 'sofa', x: 2, y: 0 },
    { type: 'table', x: 5, y: 4 },
    { type: 'plant', x: 9, y: 0 },
    { type: 'plant', x: 0, y: 9 },
    { type: 'lamp', x: 9, y: 9 },
  ],
};
const blocked = new Set(room.furniture.map((f) => `${f.x},${f.y}`));

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
    if (step) Object.assign(p, step);
  }
}, TICK_MS);

// ---------- Rede ----------
function myState() {
  return { name: me.name, color: me.color, x: me.x, y: me.y, path: me.path };
}

// Dados vindos de outros jogadores: valida antes de usar.
function upsertPlayer(id, d) {
  if (typeof id !== 'string' || id.length > 20) return null;
  const pos = isFree(d.x, d.y) ? { x: d.x, y: d.y } : { x: 4, y: 8 };
  const path = Array.isArray(d.path) ? d.path.slice(0, 40).filter((s) => isFree(s?.x, s?.y)).map((s) => ({ x: s.x, y: s.y })) : [];
  let p = players.get(id);
  if (!p) {
    p = { id, drawX: pos.x, drawY: pos.y };
    players.set(id, p);
  }
  Object.assign(p, {
    name: String(d.name || 'Visitante').slice(0, 16),
    color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#888888',
    ...pos,
    path,
    seen: Date.now(),
  });
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
    case 'chat': {
      const p = players.get(msg.id);
      const text = String(msg.text || '').trim().slice(0, 120);
      if (!p || !text) break;
      p.seen = Date.now();
      chatLines.forEach((l) => l.row++);
      chatLines.push({ x: toScreen(p.drawX, p.drawY).x, name: p.name, color: p.color, text, row: 0 });
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
  const senha = document.getElementById('senha').value;
  try {
    localStorage.setItem('vloc', JSON.stringify({ name, color, senha }));
  } catch {}
  // Nasce num quadrado livre perto da porta.
  const x = 2 + Math.floor(Math.random() * 6);
  const y = 7 + Math.floor(Math.random() * 3);
  me = { id: myId, name, color, x, y, path: [], drawX: x, drawY: y, seen: Infinity };
  players.set(myId, me);

  document.getElementById('login').style.display = 'none';
  document.getElementById('chat').style.display = 'block';
  document.getElementById('online').style.display = 'block';
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
    document.getElementById('senha').value = salvo.senha;
  }
} catch {}

function updateOnline() {
  const names = [...players.values()].map((p) => p.name).join(', ');
  document.getElementById('online').textContent = `🟢 ${players.size} online: ${names}`;
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

// ---------- Desenho ----------
function diamond(x, y, fill, stroke) {
  const s = toScreen(x, y);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - TILE_H / 2);
  ctx.lineTo(s.x + TILE_W / 2, s.y);
  ctx.lineTo(s.x, s.y + TILE_H / 2);
  ctx.lineTo(s.x - TILE_W / 2, s.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawWalls() {
  const top = toScreen(-0.5, -0.5);
  const left = toScreen(-0.5, room.h - 0.5);
  const right = toScreen(room.w - 0.5, -0.5);
  // Parede esquerda
  ctx.fillStyle = '#b9a88c';
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(top.x, top.y);
  ctx.lineTo(top.x, top.y - WALL_H);
  ctx.lineTo(left.x, left.y - WALL_H);
  ctx.fill();
  // Parede direita
  ctx.fillStyle = '#d4c4a8';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(right.x, right.y - WALL_H);
  ctx.lineTo(top.x, top.y - WALL_H);
  ctx.fill();
  // Janela na parede direita
  const w1 = toScreen(3.5, -0.5);
  const w2 = toScreen(6.5, -0.5);
  ctx.fillStyle = '#8fd3ff';
  ctx.beginPath();
  ctx.moveTo(w1.x, w1.y - 30);
  ctx.lineTo(w2.x, w2.y - 30);
  ctx.lineTo(w2.x, w2.y - 85);
  ctx.lineTo(w1.x, w1.y - 85);
  ctx.fill();
}

function drawFloor() {
  for (let y = 0; y < room.h; y++) {
    for (let x = 0; x < room.w; x++) {
      diamond(x, y, (x + y) % 2 ? '#8a6f4e' : '#957a58', 'rgba(0,0,0,.15)');
    }
  }
  if (hover) diamond(hover.x, hover.y, 'rgba(255,255,255,.25)', '#fff');
}

function box(sx, sy, w, h, height, top, left, right) {
  // Caixa isométrica centrada em (sx, sy) no chão.
  const hw = w / 2;
  const hh = h / 2;
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(sx - hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx, sy + hh - height);
  ctx.lineTo(sx - hw, sy - height);
  ctx.fill();
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx, sy + hh - height);
  ctx.lineTo(sx + hw, sy - height);
  ctx.fill();
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh - height);
  ctx.lineTo(sx + hw, sy - height);
  ctx.lineTo(sx, sy + hh - height);
  ctx.lineTo(sx - hw, sy - height);
  ctx.fill();
}

function drawFurniture(f) {
  const s = toScreen(f.x, f.y);
  if (f.type === 'sofa') {
    box(s.x, s.y, 52, 26, 14, '#e05a5a', '#a83a3a', '#c44848');
    box(s.x - 6, s.y - 3, 40, 20, 32, '#e05a5a', '#a83a3a', '#c44848');
  } else if (f.type === 'table') {
    box(s.x, s.y, 12, 6, 22, '#5a3d24', '#4a3020', '#5a3d24');
    box(s.x, s.y - 22, 56, 28, 5, '#c9935a', '#8a5f34', '#a87444');
  } else if (f.type === 'plant') {
    box(s.x, s.y, 26, 13, 16, '#d07a3a', '#a0582a', '#b86630');
    ctx.fillStyle = '#3fae5a';
    for (const [dx, dy, r] of [[0, -34, 14], [-9, -26, 10], [9, -26, 10], [0, -46, 9]]) {
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === 'lamp') {
    box(s.x, s.y, 20, 10, 4, '#555', '#333', '#444');
    ctx.fillStyle = '#666';
    ctx.fillRect(s.x - 2, s.y - 50, 4, 48);
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath();
    ctx.moveTo(s.x - 14, s.y - 48);
    ctx.lineTo(s.x + 14, s.y - 48);
    ctx.lineTo(s.x + 8, s.y - 68);
    ctx.lineTo(s.x - 8, s.y - 68);
    ctx.fill();
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function drawPlayer(p, now) {
  const s = toScreen(p.drawX, p.drawY);
  const walking = Math.abs(p.drawX - p.x) + Math.abs(p.drawY - p.y) > 0.02;
  const bob = walking ? Math.sin(now / 70) * 2 : 0;
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pernas
  ctx.fillStyle = '#2d3a5a';
  ctx.fillRect(s.x - 7, s.y - 18 + bob, 6, 16);
  ctx.fillRect(s.x + 1, s.y - 18 - bob, 6, 16);
  // Corpo
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.roundRect(s.x - 10, s.y - 42, 20, 26, 6);
  ctx.fill();
  ctx.fillStyle = shade(p.color, -40);
  ctx.fillRect(s.x - 14, s.y - 40, 4, 16);
  ctx.fillRect(s.x + 10, s.y - 40, 4, 16);
  // Cabeça
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(s.x, s.y - 52, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a2f1d';
  ctx.beginPath();
  ctx.arc(s.x, s.y - 55, 11, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(s.x - 5, s.y - 52, 3, 3);
  ctx.fillRect(s.x + 2, s.y - 52, 3, 3);
  // Nome
  ctx.font = `bold ${textPx(12)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(p.name).width + 10;
  const th = textPx(17);
  ctx.fillStyle = p.id === myId ? 'rgba(233,69,96,.9)' : 'rgba(0,0,0,.6)';
  ctx.beginPath();
  ctx.roundRect(s.x - tw / 2, s.y - 74 - th, tw, th, th / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(p.name, s.x, s.y - 74 - th / 2);
  ctx.textBaseline = 'alphabetic';
}

// Tamanho de texto que continua legível quando a sala é reduzida no celular.
function textPx(px) {
  return px / Math.max(scale, 0.7);
}

function drawChat(now) {
  if (chatLines.length && now - lastScroll > CHAT_SCROLL_MS) {
    chatLines.forEach((l) => l.row++);
    lastScroll = now;
  }
  const rowH = textPx(CHAT_ROW_H);
  const baseY = origin.y - WALL_H + rowH * 2;
  chatLines = chatLines.filter((l) => baseY - l.row * rowH > chatTop);
  const viewW = innerWidth / scale;
  for (const l of chatLines) {
    const y = baseY - l.row * rowH;
    ctx.font = `bold ${textPx(13)}px system-ui`;
    const nameW = ctx.measureText(`${l.name}: `).width;
    ctx.font = `${textPx(13)}px system-ui`;
    const w = nameW + ctx.measureText(l.text).width + textPx(30);
    const x = Math.max(4, Math.min(viewW - w - 4, l.x - w / 2));
    const h = rowH - textPx(4);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1b1d2a';
    ctx.lineWidth = 1.5 / scale;
    ctx.beginPath();
    ctx.roundRect(x, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    // Bolinha com a cor do avatar, como o rosto no balão do Habbo.
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(x + textPx(12), y, textPx(6), 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1b1d2a';
    ctx.font = `bold ${textPx(13)}px system-ui`;
    ctx.fillText(`${l.name}: `, x + textPx(22), y);
    ctx.font = `${textPx(13)}px system-ui`;
    ctx.fillText(l.text, x + textPx(22) + nameW, y);
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 1;
  }
}

function frame(now) {
  ctx.clearRect(0, 0, innerWidth / scale, innerHeight / scale);
  if (room) {
    drawWalls();
    drawFloor();
    // Interpola posição para o movimento ficar suave.
    for (const p of players.values()) {
      p.drawX += (p.x - p.drawX) * 0.2;
      p.drawY += (p.y - p.drawY) * 0.2;
    }
    // Ordena móveis e avatares por profundidade (x + y).
    const items = [
      ...room.furniture.map((f) => ({ depth: f.x + f.y, draw: () => drawFurniture(f) })),
      ...[...players.values()].map((p) => ({ depth: p.drawX + p.drawY + 0.01, draw: () => drawPlayer(p, now) })),
    ].sort((a, b) => a.depth - b.depth);
    items.forEach((it) => it.draw());
    drawChat(now);
  }
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);
