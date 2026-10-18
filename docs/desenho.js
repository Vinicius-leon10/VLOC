// Desenho da sala, dos móveis, dos avatares e dos balões, no estilo do Habbo clássico.
const FONTE = '"Ubuntu", system-ui, sans-serif';
const CONTORNO = 'rgba(24, 18, 32, .55)';
const PISO_ESPESSURA = 9;
const PAREDE_ESPESSURA = 0.22; // em quadrados
const PELE = '#f5cba7';

// ---------- Utilitários ----------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function poly(pts, fill, stroke, c = ctx) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
  }
}

// Ponto na tela para uma posição (x, y) do piso, z pixels acima do chão.
function iso(x, y, z = 0) {
  const s = toScreen(x, y);
  return { x: s.x, y: s.y - z };
}

// Caixa isométrica centrada em (x, y), com meia-largura ex/ey (em quadrados),
// começando na altura z e com h pixels de altura.
function isoBox(x, y, ex, ey, z, h, cor, contorno = CONTORNO) {
  const A = (zz) => iso(x - ex, y - ey, zz);
  const B = (zz) => iso(x + ex, y - ey, zz);
  const C = (zz) => iso(x + ex, y + ey, zz);
  const D = (zz) => iso(x - ex, y + ey, zz);
  poly([D(z), C(z), C(z + h), D(z + h)], shade(cor, -38), contorno);
  poly([C(z), B(z), B(z + h), C(z + h)], shade(cor, -18), contorno);
  poly([A(z + h), B(z + h), C(z + h), D(z + h)], cor, contorno);
}

function hashCor(texto, cores) {
  let h = 0;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}

// ---------- Sala ----------
function drawBackground() {
  const w = innerWidth / scale;
  const h = innerHeight / scale;
  const g = ctx.createRadialGradient(w / 2, h * 0.4, 50, w / 2, h * 0.4, Math.max(w, h));
  g.addColorStop(0, '#22304f');
  g.addColorStop(1, '#090d18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawWalls() {
  const W = room.w - 0.5;
  const H = room.h - 0.5;
  const t = PAREDE_ESPESSURA;
  const esq = (u, v) => iso(-0.5, u, v); // parede esquerda: u ao longo de y
  const dir = (u, v) => iso(u, -0.5, v); // parede direita: u ao longo de x

  // Superfícies com listras de papel de parede.
  poly([esq(H, 0), esq(-0.5, 0), esq(-0.5, WALL_H), esq(H, WALL_H)], '#b9c3dc');
  poly([dir(-0.5, 0), dir(W, 0), dir(W, WALL_H), dir(-0.5, WALL_H)], '#d3dbee');
  for (let i = 0; i < room.h; i++) poly([esq(i - 0.5, 0), esq(i - 0.25, 0), esq(i - 0.25, WALL_H), esq(i - 0.5, WALL_H)], 'rgba(255,255,255,.10)');
  for (let i = 0; i < room.w; i++) poly([dir(i - 0.5, 0), dir(i - 0.25, 0), dir(i - 0.25, WALL_H), dir(i - 0.5, WALL_H)], 'rgba(255,255,255,.16)');
  // Rodapé
  poly([esq(H, 0), esq(-0.5, 0), esq(-0.5, 7), esq(H, 7)], '#7d86a3');
  poly([dir(-0.5, 0), dir(W, 0), dir(W, 7), dir(-0.5, 7)], '#959eb9');

  // Porta na parede esquerda.
  const p0 = room.h - 3.4;
  const p1 = room.h - 2.6;
  poly([esq(p1 + 0.08, 0), esq(p0 - 0.08, 0), esq(p0 - 0.08, 78), esq(p1 + 0.08, 78)], '#6b4a2e', CONTORNO);
  poly([esq(p1, 0), esq(p0, 0), esq(p0, 72), esq(p1, 72)], '#1c1426');

  // Janela na parede direita, com céu e cortinas.
  const j0 = 3.6;
  const j1 = 6.4;
  const sky = ctx.createLinearGradient(0, dir(j0, 92).y, 0, dir(j0, 36).y);
  sky.addColorStop(0, '#5fb7f2');
  sky.addColorStop(1, '#bfe6ff');
  poly([dir(j0 - 0.08, 30), dir(j1 + 0.08, 30), dir(j1 + 0.08, 98), dir(j0 - 0.08, 98)], '#f7f7fb', CONTORNO);
  poly([dir(j0, 36), dir(j1, 36), dir(j1, 92), dir(j0, 92)], sky);
  const nuvem = dir(j0 + 0.9, 74);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const [dx, dy, r] of [[0, 0, 7], [8, -3, 8], [16, 1, 6]]) {
    ctx.beginPath();
    ctx.ellipse(nuvem.x + dx, nuvem.y + dy, r * 1.3, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const meio = (j0 + j1) / 2;
  poly([dir(meio - 0.04, 36), dir(meio + 0.04, 36), dir(meio + 0.04, 92), dir(meio - 0.04, 92)], '#f7f7fb');
  poly([dir(j0, 63), dir(j1, 63), dir(j1, 66), dir(j0, 66)], '#f7f7fb');
  poly([dir(j0 - 0.25, 26), dir(j0 + 0.35, 26), dir(j0 + 0.15, 102), dir(j0 - 0.25, 102)], '#c94f6d', CONTORNO);
  poly([dir(j1 - 0.35, 26), dir(j1 + 0.25, 26), dir(j1 + 0.25, 102), dir(j1 - 0.15, 102)], '#c94f6d', CONTORNO);

  // Espessura no topo das paredes e nas pontas.
  const oL = { x: -t * (TILE_W / 2), y: -t * (TILE_H / 2) };
  const oR = { x: t * (TILE_W / 2), y: -t * (TILE_H / 2) };
  const add = (p, o) => ({ x: p.x + o.x, y: p.y + o.y });
  const L = esq(H, WALL_H);
  const T = esq(-0.5, WALL_H);
  const R = dir(W, WALL_H);
  poly([L, T, add(T, oL), add(L, oL)], '#eef1f8', CONTORNO);
  poly([T, R, add(R, oR), add(T, oR)], '#f6f8fc', CONTORNO);
  poly([T, add(T, oL), add(add(T, oL), oR), add(T, oR)], '#f6f8fc', CONTORNO);
  poly([esq(H, -PISO_ESPESSURA), L, add(L, oL), add(esq(H, -PISO_ESPESSURA), oL)], '#9aa4c0', CONTORNO);
  poly([dir(W, -PISO_ESPESSURA), R, add(R, oR), add(dir(W, -PISO_ESPESSURA), oR)], '#aeb7d0', CONTORNO);
}

function drawFloor() {
  const W = room.w - 0.5;
  const H = room.h - 0.5;
  // Espessura do piso (lados da frente).
  poly([iso(-0.5, H), iso(W, H), iso(W, H, -PISO_ESPESSURA), iso(-0.5, H, -PISO_ESPESSURA)], '#a07c52', CONTORNO);
  poly([iso(W, -0.5), iso(W, H), iso(W, H, -PISO_ESPESSURA), iso(W, -0.5, -PISO_ESPESSURA)], '#86663f', CONTORNO);
  for (let y = 0; y < room.h; y++) {
    for (let x = 0; x < room.w; x++) {
      poly([iso(x - 0.5, y - 0.5), iso(x + 0.5, y - 0.5), iso(x + 0.5, y + 0.5), iso(x - 0.5, y + 0.5)], (x + y) % 2 ? '#d7b98a' : '#dcbf91', 'rgba(140, 104, 60, .35)');
    }
  }
  for (const f of room.furniture) if (f.type === 'rug') drawRug(f);
}

function drawRug(f) {
  const x0 = f.x - 0.45;
  const y0 = f.y - 0.45;
  const x1 = f.x + f.w - 0.55;
  const y1 = f.y + f.h - 0.55;
  poly([iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)], '#3d6fb6', CONTORNO);
  const m = 0.22;
  poly([iso(x0 + m, y0 + m), iso(x1 - m, y0 + m), iso(x1 - m, y1 - m), iso(x0 + m, y1 - m)], '#4f86d1', 'rgba(255,255,255,.55)');
  const n = 0.75;
  poly([iso(x0 + n, y0 + n), iso(x1 - n, y0 + n), iso(x1 - n, y1 - n), iso(x0 + n, y1 - n)], '#f2c14e', 'rgba(255,255,255,.55)');
}

function drawCursor() {
  if (!hover) return;
  const pts = [iso(hover.x - 0.5, hover.y - 0.5), iso(hover.x + 0.5, hover.y - 0.5), iso(hover.x + 0.5, hover.y + 0.5), iso(hover.x - 0.5, hover.y + 0.5)];
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  poly(pts, null, null);
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.lineWidth = 1;
}

// ---------- Móveis ----------
function drawFurniture(f) {
  const { x, y } = f;
  if (f.type === 'sofa') {
    const cx = x + (f.w - 1) / 2;
    const ex = f.w / 2 - 0.08;
    isoBox(cx, y + 0.05, ex, 0.38, 0, 12, '#b23a48');
    isoBox(cx, y + 0.05, ex - 0.1, 0.3, 12, 6, '#d9576a');
    isoBox(cx, y - 0.3, ex, 0.1, 12, 26, '#c44659');
    isoBox(cx - ex + 0.08, y + 0.05, 0.08, 0.38, 12, 12, '#a3313f');
    isoBox(cx + ex - 0.08, y + 0.05, 0.08, 0.38, 12, 12, '#a3313f');
  } else if (f.type === 'table') {
    for (const [dx, dy] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) isoBox(x + dx, y + dy, 0.04, 0.04, 0, 22, '#6b4423');
    isoBox(x, y, 0.42, 0.42, 22, 5, '#c98d4f');
    // Vaso de flores em cima da mesa.
    isoBox(x, y, 0.07, 0.07, 27, 9, '#f0f3fa');
    const s = iso(x, y, 40);
    for (const [dx, dy, c] of [[-4, 0, '#ff6b8b'], [4, -2, '#ffd447'], [0, -6, '#ff9f43']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === 'stool') {
    isoBox(x, y, 0.05, 0.05, 0, 14, '#6b4423');
    isoBox(x, y, 0.24, 0.24, 14, 5, '#e3a857');
  } else if (f.type === 'plant') {
    isoBox(x, y, 0.2, 0.2, 0, 16, '#c8693a');
    isoBox(x, y, 0.22, 0.22, 16, 3, '#d97b48');
    const s = iso(x, y, 19);
    const folhas = [[-10, -10, 9, '#2f8f4e'], [10, -10, 9, '#2f8f4e'], [0, -16, 11, '#38a85b'], [-6, -26, 9, '#41bd67'], [7, -25, 8, '#41bd67'], [0, -34, 7, '#56d17c']];
    for (const [dx, dy, r, c] of folhas) {
      ctx.fillStyle = c;
      ctx.strokeStyle = CONTORNO;
      ctx.beginPath();
      ctx.ellipse(s.x + dx, s.y + dy, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'lamp') {
    const glow = iso(x, y, 64);
    const g = ctx.createRadialGradient(glow.x, glow.y, 4, glow.x, glow.y, 70);
    g.addColorStop(0, 'rgba(255, 226, 140, .45)');
    g.addColorStop(1, 'rgba(255, 226, 140, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(glow.x - 70, glow.y - 70, 140, 140);
    isoBox(x, y, 0.16, 0.16, 0, 4, '#4b4f63');
    isoBox(x, y, 0.025, 0.025, 4, 52, '#6d7290');
    const a = iso(x, y, 56);
    poly([{ x: a.x - 15, y: a.y }, { x: a.x + 15, y: a.y }, { x: a.x + 9, y: a.y - 20 }, { x: a.x - 9, y: a.y - 20 }], '#ffe08a', CONTORNO);
    poly([{ x: a.x + 3, y: a.y }, { x: a.x + 15, y: a.y }, { x: a.x + 9, y: a.y - 20 }, { x: a.x + 2, y: a.y - 20 }], '#f5c95c');
  } else if (f.type === 'shelf') {
    isoBox(x, y - 0.2, 0.44, 0.22, 0, 70, '#8a5a32');
    // Livros na frente da estante.
    const cores = ['#e94560', '#3a7bd5', '#f2c14e', '#2fa36b', '#9b59b6', '#ff8c42'];
    for (let fileira = 0; fileira < 3; fileira++) {
      const z0 = 8 + fileira * 21;
      const y0 = y + 0.02;
      poly([iso(x - 0.4, y0, z0), iso(x + 0.4, y0, z0), iso(x + 0.4, y0, z0 + 17), iso(x - 0.4, y0, z0 + 17)], '#3d2716');
      for (let i = 0; i < 6; i++) {
        const u = x - 0.37 + i * 0.125;
        const alt = 12 + ((i * 7 + fileira * 3) % 5);
        poly([iso(u, y0, z0), iso(u + 0.1, y0, z0), iso(u + 0.1, y0, z0 + alt), iso(u, y0, z0 + alt)], cores[(i + fileira * 2) % cores.length], CONTORNO);
      }
    }
  }
}

// ---------- Avatar ----------
// Desenha um avatar com os pés em (sx, sy). o = { shirt, hair, front, right, walk, acao, t, blink }
function drawAvatar(c, sx, sy, o) {
  const t = o.t || 0;
  const passo = o.walk ? Math.sin(t / 85) : 0;
  const danca = o.acao === 'dancar';
  const bob = danca ? Math.abs(Math.sin(t / 160)) * -4 : o.walk ? Math.abs(passo) * -1.5 : 0;
  const calca = '#34405e';

  c.save();
  // Sombra
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.beginPath();
  c.ellipse(sx, sy, 15, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.translate(sx, sy + bob);
  if (!o.right) c.scale(-1, 1);
  c.lineWidth = 1.2;
  c.strokeStyle = CONTORNO;
  c.lineJoin = 'round';

  const rect = (x, y, w, h, r, cor) => {
    c.fillStyle = cor;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
    c.stroke();
  };
  const braco = (ombroX, ang, cor, frente) => {
    c.save();
    c.translate(ombroX, -40);
    c.rotate(ang);
    rect(-3.5, -2, 7, 13, 3, frente ? cor : shade(cor, -30));
    rect(-3, 9, 6, 9, 3, frente ? PELE : shade(PELE, -25));
    c.restore();
  };

  // Ângulos dos braços: andar balança, acenar levanta um braço, dançar alterna.
  let angFrente = passo * 0.5;
  let angTras = -passo * 0.5;
  if (danca) {
    const d = Math.sin(t / 160);
    angFrente = -2.4 + d * 0.5;
    angTras = 2.4 + d * 0.5;
  } else if (o.acao === 'acenar') {
    angFrente = -2.7 + Math.sin(t / 90) * 0.35;
  }

  // Braço e perna de trás
  braco(-7, angTras, o.shirt, false);
  rect(-6, -21 - passo * 2, 7, 19, 3, shade(calca, -20));
  rect(-7, -4 - passo * 2, 9, 5, 2, '#22222c');
  // Perna da frente
  rect(0, -21 + passo * 2, 7, 19, 3, calca);
  rect(-1, -4 + passo * 2, 10, 5, 2, '#2c2c38');
  // Tronco
  rect(-9, -44, 18, 26, 6, o.shirt);
  c.fillStyle = shade(o.shirt, -25);
  c.fillRect(4, -40, 4, 20);
  if (o.front) {
    // Gola
    c.fillStyle = PELE;
    c.beginPath();
    c.moveTo(-2, -44);
    c.lineTo(4, -44);
    c.lineTo(1, -39);
    c.closePath();
    c.fill();
  }
  // Braço da frente
  braco(7, angFrente, o.shirt, true);

  // Cabeça
  c.fillStyle = PELE;
  c.beginPath();
  c.ellipse(1, -55, 11, 12, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  if (o.front) {
    // Orelha, olhos e boca, virados para o lado em que anda.
    c.fillStyle = shade(PELE, -20);
    c.beginPath();
    c.ellipse(-8, -54, 2.5, 3.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1d1a26';
    const olhoH = o.blink ? 1 : 4;
    c.fillRect(2, -57 + (4 - olhoH) / 2, 2.2, olhoH);
    c.fillRect(7, -57 + (4 - olhoH) / 2, 2.2, olhoH);
    c.fillStyle = '#c0605a';
    c.fillRect(4, -49, 4, 1.4);
    c.fillStyle = 'rgba(255, 120, 120, .35)';
    c.beginPath();
    c.arc(9, -51, 2, 0, Math.PI * 2);
    c.fill();
  }
  // Cabelo
  c.fillStyle = o.hair;
  c.beginPath();
  if (o.front) {
    c.moveTo(-10, -52);
    c.quadraticCurveTo(-12, -70, 2, -68.5);
    c.quadraticCurveTo(14, -68, 12, -58);
    c.quadraticCurveTo(6, -62, 0, -60);
    c.quadraticCurveTo(-4, -57, -6, -50);
    c.closePath();
  } else {
    c.ellipse(1, -57, 11.5, 11, 0, Math.PI * 0.95, Math.PI * 2.05);
    c.lineTo(11, -50);
    c.quadraticCurveTo(1, -45, -9, -50);
    c.closePath();
  }
  c.fill();
  c.stroke();
  c.restore();
}

function drawPlayer(p, now) {
  const s = toScreen(p.drawX, p.drawY);
  const walking = Math.abs(p.drawX - p.x) + Math.abs(p.drawY - p.y) > 0.03 || p.path.length > 0;
  if (p.acao === 'acenar' && now > p.acaoAte) p.acao = null;
  drawAvatar(ctx, s.x, s.y, {
    shirt: p.color,
    hair: p.hair || '#4a2f1d',
    front: p.front !== false,
    right: !!p.right,
    walk: walking,
    acao: walking ? null : p.acao,
    t: now + (p.fase || 0),
    blink: (now + (p.fase || 0)) % 3800 < 140,
  });
  // Nome acima da cabeça
  ctx.font = `bold ${textPx(11)}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(p.name).width + textPx(12);
  const th = textPx(16);
  const ny = s.y - 78 - th / 2;
  ctx.fillStyle = p.id === myId ? 'rgba(46, 125, 50, .92)' : 'rgba(20, 22, 34, .72)';
  ctx.beginPath();
  ctx.roundRect(s.x - tw / 2, ny - th / 2, tw, th, th / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(p.name, s.x, ny + 0.5);
  ctx.textBaseline = 'alphabetic';
}

// Tamanho de texto que continua legível quando a sala é reduzida no celular.
function textPx(px) {
  return px / Math.min(Math.max(scale, 0.7), 1);
}

// ---------- Chat (balões que sobem, como no Habbo) ----------
function drawChat(now) {
  if (chatLines.length && now - lastScroll > CHAT_SCROLL_MS) {
    chatLines.forEach((l) => l.row++);
    lastScroll = now;
  }
  const rowH = textPx(CHAT_ROW_H);
  const baseY = origin.y - WALL_H + rowH * 2;
  chatLines = chatLines.filter((l) => baseY - l.row * rowH > chatTop);
  const viewW = innerWidth / scale;
  const fs = textPx(13);
  for (const l of chatLines) {
    const y = baseY - l.row * rowH;
    const h = rowH - textPx(5);
    ctx.font = `bold ${fs}px ${FONTE}`;
    const nameW = ctx.measureText(`${l.name}: `).width;
    ctx.font = `${fs}px ${FONTE}`;
    const icone = h;
    const w = icone + nameW + ctx.measureText(l.text).width + textPx(14);
    const x = Math.max(4, Math.min(viewW - w - 4, l.x - w / 2));
    const top = y - h / 2;
    // Setinha apontando para quem falou
    const px = Math.max(x + 8, Math.min(x + w - 8, l.x));
    ctx.lineWidth = 1.5 / Math.max(scale, 0.7);
    ctx.strokeStyle = '#1a1a24';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x, top, w, h, textPx(6));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - textPx(5), top + h - 0.5);
    ctx.lineTo(px, top + h + textPx(5));
    ctx.lineTo(px + textPx(5), top + h - 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(px - textPx(4), top + h - textPx(2), textPx(8), textPx(2));
    // Cabecinha de quem falou
    const hx = x + icone / 2 + textPx(2);
    const r = icone * 0.32;
    ctx.fillStyle = PELE;
    ctx.beginPath();
    ctx.arc(hx, y + r * 0.15, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = l.hair;
    ctx.beginPath();
    ctx.arc(hx, y - r * 0.05, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.fillStyle = l.color;
    ctx.fillRect(hx - r * 0.9, y + r * 1.05, r * 1.8, r * 0.5);
    // Texto
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a24';
    ctx.font = `bold ${fs}px ${FONTE}`;
    ctx.fillText(`${l.name}: `, x + icone + textPx(4), y + 0.5);
    ctx.font = `${fs}px ${FONTE}`;
    ctx.fillText(l.text, x + icone + textPx(4) + nameW, y + 0.5);
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 1;
  }
}

function frame(now) {
  drawBackground();
  drawWalls();
  drawFloor();
  drawCursor();
  // Interpola posição para o movimento ficar suave.
  for (const p of players.values()) {
    p.drawX += (p.x - p.drawX) * 0.2;
    p.drawY += (p.y - p.drawY) * 0.2;
  }
  // Ordena móveis e avatares por profundidade (x + y).
  const items = [
    ...room.furniture.filter((f) => f.type !== 'rug').map((f) => ({ depth: f.x + (f.w || 1) - 1 + f.y, draw: () => drawFurniture(f) })),
    ...[...players.values()].map((p) => ({ depth: p.drawX + p.drawY + 0.01, draw: () => drawPlayer(p, now) })),
  ].sort((a, b) => a.depth - b.depth);
  items.forEach((it) => it.draw());
  drawChat(now);
  requestAnimationFrame(frame);
}
