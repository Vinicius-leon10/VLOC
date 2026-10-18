// Cliente: desenha a sala isométrica, os avatares e os balões de chat.
const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');
const TILE_W = 64;
const TILE_H = 32;
const WALL_H = 110;

let ws;
let myId = null;
let room = null;
const players = new Map(); // id -> { name, color, x, y, drawX, drawY }
let origin = { x: 0, y: 0 };
let scale = 1;
let hover = null;
// Chat no estilo Habbo: balões sobem juntos pela tela a cada mensagem.
const CHAT_ROW_H = 26;
const CHAT_SCROLL_MS = 4000;
let chatLines = []; // { x, name, color, text, row }
let chatTop = 40;
let lastScroll = 0;

// ---------- Conexão ----------
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}`);
  ws.onopen = () => ws.send(JSON.stringify({
    type: 'join',
    name: document.getElementById('nome').value,
    password: document.getElementById('senha').value,
    color: document.getElementById('cor').value,
  }));
  ws.onmessage = (ev) => handle(JSON.parse(ev.data));
  ws.onclose = () => {
    if (myId) alert('Conexão perdida. Recarregue a página.');
  };
});

function addPlayer(p) {
  players.set(p.id, { ...p, drawX: p.x, drawY: p.y });
}

function handle(msg) {
  switch (msg.type) {
    case 'error':
      document.getElementById('erro').textContent = msg.message;
      ws.close();
      break;
    case 'welcome':
      myId = msg.you;
      room = msg.room;
      resize();
      msg.players.forEach(addPlayer);
      document.getElementById('login').style.display = 'none';
      document.getElementById('chat').style.display = 'block';
      document.getElementById('online').style.display = 'block';
      updateOnline();
      break;
    case 'joined':
      if (!players.has(msg.player.id)) addPlayer(msg.player);
      updateOnline();
      break;
    case 'left':
      players.delete(msg.id);
      updateOnline();
      break;
    case 'moves':
      for (const m of msg.moves) {
        const p = players.get(m.id);
        if (p) Object.assign(p, { x: m.x, y: m.y });
      }
      break;
    case 'chat': {
      const p = players.get(msg.id);
      if (!p) break;
      chatLines.forEach((l) => l.row++);
      chatLines.push({ x: toScreen(p.drawX, p.drawY).x, name: p.name, color: p.color, text: msg.text, row: 0 });
      lastScroll = performance.now();
      break;
    }
  }
}

function updateOnline() {
  const names = [...players.values()].map((p) => p.name).join(', ');
  document.getElementById('online').textContent = `🟢 ${players.size} online: ${names}`;
}

document.getElementById('chat').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('msg');
  if (input.value.trim()) ws.send(JSON.stringify({ type: 'chat', text: input.value }));
  input.value = '';
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
  if (inRoom(t) && ws?.readyState === 1) ws.send(JSON.stringify({ type: 'move', x: t.x, y: t.y }));
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
