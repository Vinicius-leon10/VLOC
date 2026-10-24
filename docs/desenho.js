// Desenho da sala, dos móveis, dos avatares e dos balões.
const FONTE = '"Ubuntu", system-ui, sans-serif';
const CONTORNO = 'rgba(30, 20, 14, .45)';
const PISO_ESPESSURA = 16;
const PAREDE_ESPESSURA = 0.22; // em quadrados
const PELE = '#f3c6a0';

// ---------- Utilitários ----------
// Clareia (amt > 0) ou escurece uma cor '#rrggbb' ou 'rgb(r,g,b)'.
function shade(cor, amt) {
  let r, g, b;
  if (cor.startsWith('#')) {
    const n = parseInt(cor.slice(1), 16);
    [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  } else {
    [r, g, b] = cor.match(/\d+/g).map(Number);
  }
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
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
  poly([D(z), C(z), C(z + h), D(z + h)], shade(cor, -34), contorno);
  poly([C(z), B(z), B(z + h), C(z + h)], shade(cor, -16), contorno);
  poly([A(z + h), B(z + h), C(z + h), D(z + h)], cor, contorno);
}

// Brilho suave e redondo (luz da luminária, reflexos no piso).
function brilho(x, y, r, cor, achatado = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, achatado);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, cor);
  g.addColorStop(1, cor.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

// ---------- Sala ----------
function drawBackground() {
  const w = innerWidth / scale;
  const h = innerHeight / scale;
  const g = ctx.createRadialGradient(w / 2, h * 0.45, 40, w / 2, h * 0.45, Math.max(w, h) * 0.8);
  g.addColorStop(0, '#2c2f3a');
  g.addColorStop(1, '#14151b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawWalls() {
  const W = room.w - 0.5;
  const H = room.h - 0.5;
  const t = PAREDE_ESPESSURA;
  const esq = (u, v) => iso(-0.5, u, v); // parede esquerda: u ao longo de y
  const dir = (u, v) => iso(u, -0.5, v); // parede direita: u ao longo de x

  // Superfícies lisas, mais claras em cima e com sombra no canto.
  const topoY = esq(-0.5, WALL_H).y;
  const baseY = esq(H, 0).y;
  const gE = ctx.createLinearGradient(0, topoY, 0, baseY);
  gE.addColorStop(0, '#a9b0c1');
  gE.addColorStop(1, '#949bae');
  const gD = ctx.createLinearGradient(0, topoY, 0, baseY);
  gD.addColorStop(0, '#bfc5d3');
  gD.addColorStop(1, '#aab1c2');
  poly([esq(H, 0), esq(-0.5, 0), esq(-0.5, WALL_H), esq(H, WALL_H)], gE);
  poly([dir(-0.5, 0), dir(W, 0), dir(W, WALL_H), dir(-0.5, WALL_H)], gD);
  const canto = dir(-0.5, 0);
  const sombra = ctx.createLinearGradient(canto.x, 0, canto.x + 60, 0);
  sombra.addColorStop(0, 'rgba(40, 44, 60, .25)');
  sombra.addColorStop(1, 'rgba(40, 44, 60, 0)');
  poly([dir(-0.5, 0), dir(1.5, 0), dir(1.5, WALL_H), dir(-0.5, WALL_H)], sombra);
  // Rodapé branco
  poly([esq(H, 0), esq(-0.5, 0), esq(-0.5, 6), esq(H, 6)], '#dfe2ea', 'rgba(60, 64, 80, .25)');
  poly([dir(-0.5, 0), dir(W, 0), dir(W, 6), dir(-0.5, 6)], '#eceef3', 'rgba(60, 64, 80, .25)');

  // Porta na parede esquerda, com batente de madeira.
  const p0 = room.h - 3.45;
  const p1 = room.h - 2.55;
  poly([esq(p1 + 0.1, 0), esq(p0 - 0.1, 0), esq(p0 - 0.1, 84), esq(p1 + 0.1, 84)], '#7a4a26', CONTORNO);
  const gP = ctx.createLinearGradient(0, esq(p0, 76).y, 0, esq(p0, 0).y);
  gP.addColorStop(0, '#0d0b10');
  gP.addColorStop(1, '#2a1d17');
  poly([esq(p1, 0), esq(p0, 0), esq(p0, 77), esq(p1, 77)], gP);
  poly([esq(p1, 0), esq(p1 + 0.04, 0), esq(p1 + 0.04, 77), esq(p1, 77)], '#5b361b');

  // Janela na parede direita: moldura branca, céu com árvores.
  const j0 = 4.1;
  const j1 = 6.6;
  const z0 = 36;
  const z1 = 108;
  poly([dir(j0 - 0.12, z0 - 6), dir(j1 + 0.12, z0 - 6), dir(j1 + 0.12, z1 + 6), dir(j0 - 0.12, z1 + 6)], '#f4f5f8', 'rgba(60, 64, 80, .4)');
  const ceu = ctx.createLinearGradient(0, dir(j0, z1).y, 0, dir(j0, z0).y);
  ceu.addColorStop(0, '#3f9be6');
  ceu.addColorStop(1, '#a8dcff');
  poly([dir(j0, z0), dir(j1, z0), dir(j1, z1), dir(j0, z1)], ceu);
  ctx.save();
  poly([dir(j0, z0), dir(j1, z0), dir(j1, z1), dir(j0, z1)], null, null);
  ctx.clip();
  for (const [u, v, r] of [[j0 + 0.5, 92, 7], [j0 + 0.75, 95, 8], [j0 + 1.0, 92, 6], [j1 - 0.6, 99, 5], [j1 - 0.4, 101, 6]]) {
    const p = dir(u, v);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let u = j0 - 0.2; u < j1 + 0.3; u += 0.32) {
    const p = dir(u, z0 + 6 + Math.sin(u * 7) * 3);
    ctx.fillStyle = u % 0.64 < 0.32 ? '#3e9a3e' : '#2f8233';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const meio = (j0 + j1) / 2;
  poly([dir(meio - 0.05, z0), dir(meio + 0.05, z0), dir(meio + 0.05, z1), dir(meio - 0.05, z1)], '#f4f5f8');
  poly([dir(j0, 70), dir(j1, 70), dir(j1, 74), dir(j0, 74)], '#f4f5f8');
  poly([dir(j0 - 0.14, z0 - 9), dir(j1 + 0.14, z0 - 9), dir(j1 + 0.14, z0 - 4), dir(j0 - 0.14, z0 - 4)], '#e2e4ea', 'rgba(60, 64, 80, .4)');

  // Cortinas vermelhas presas num varão.
  const varao = 118;
  ctx.strokeStyle = '#2b2b33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dir(j0 - 0.75, varao).x, dir(j0 - 0.75, varao).y);
  ctx.lineTo(dir(j1 + 0.75, varao).x, dir(j1 + 0.75, varao).y);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (const u of [j0 - 0.75, j1 + 0.75]) {
    const p = dir(u, varao);
    ctx.fillStyle = '#2b2b33';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const cortina = (a, b) => {
    const dobras = 4;
    for (let i = 0; i < dobras; i++) {
      const u0 = a + ((b - a) * i) / dobras;
      const u1 = a + ((b - a) * (i + 1)) / dobras;
      const base = 18 + (i % 2) * 3;
      poly([dir(u0, varao - 2), dir(u1, varao - 2), dir(u1, base), dir(u0, base + 2)], i % 2 ? '#a3141f' : '#c8202c');
    }
    poly([dir(a, varao - 2), dir(b, varao - 2), dir(b, 18), dir(a, 18)], null, 'rgba(60, 10, 14, .5)');
  };
  cortina(j0 - 0.7, j0 + 0.05);
  cortina(j1 - 0.05, j1 + 0.7);

  // Espessura no topo das paredes e nas pontas.
  const oL = { x: -t * (TILE_W / 2), y: -t * (TILE_H / 2) };
  const oR = { x: t * (TILE_W / 2), y: -t * (TILE_H / 2) };
  const add = (p, o) => ({ x: p.x + o.x, y: p.y + o.y });
  const L = esq(H, WALL_H);
  const T = esq(-0.5, WALL_H);
  const R = dir(W, WALL_H);
  poly([L, T, add(T, oL), add(L, oL)], '#eceef3', 'rgba(60, 64, 80, .4)');
  poly([T, R, add(R, oR), add(T, oR)], '#f6f7fa', 'rgba(60, 64, 80, .4)');
  poly([T, add(T, oL), add(add(T, oL), oR), add(T, oR)], '#f6f7fa');
  poly([esq(H, -PISO_ESPESSURA), L, add(L, oL), add(esq(H, -PISO_ESPESSURA), oL)], '#c9cdd8', 'rgba(60, 64, 80, .4)');
  poly([dir(W, -PISO_ESPESSURA), R, add(R, oR), add(dir(W, -PISO_ESPESSURA), oR)], '#d8dbe4', 'rgba(60, 64, 80, .4)');
}

function drawFloor() {
  const W = room.w - 0.5;
  const H = room.h - 0.5;
  // Laje do piso (lados da frente), com borda clara em cima.
  poly([iso(-0.5, H), iso(W, H), iso(W, H, -PISO_ESPESSURA), iso(-0.5, H, -PISO_ESPESSURA)], '#b98a52', CONTORNO);
  poly([iso(W, -0.5), iso(W, H), iso(W, H, -PISO_ESPESSURA), iso(W, -0.5, -PISO_ESPESSURA)], '#9c7240', CONTORNO);
  poly([iso(-0.5, H), iso(W, H), iso(W, H, -3), iso(-0.5, H, -3)], '#e3be86');
  poly([iso(W, -0.5), iso(W, H), iso(W, H, -3), iso(W, -0.5, -3)], '#d2ad76');

  // Superfície com degradê (mais clara perto da janela) e rejunte.
  const cantoFundo = iso(-0.5, -0.5);
  const cantoFrente = iso(W, H);
  const g = ctx.createLinearGradient(cantoFrente.x - 200, cantoFrente.y, cantoFundo.x + 260, cantoFundo.y);
  g.addColorStop(0, '#d9a866');
  g.addColorStop(1, '#efc98f');
  const pisoPts = [iso(-0.5, -0.5), iso(W, -0.5), iso(W, H), iso(-0.5, H)];
  poly(pisoPts, g);
  ctx.save();
  poly(pisoPts, null, null);
  ctx.clip();
  for (let y = 0; y < room.h; y++) {
    for (let x = 0; x < room.w; x++) {
      if ((x * 7 + y * 3) % 5 === 0) poly([iso(x - 0.5, y - 0.5), iso(x + 0.5, y - 0.5), iso(x + 0.5, y + 0.5), iso(x - 0.5, y + 0.5)], 'rgba(255, 255, 255, .05)');
      if ((x * 3 + y * 5) % 7 === 0) poly([iso(x - 0.5, y - 0.5), iso(x + 0.5, y - 0.5), iso(x + 0.5, y + 0.5), iso(x - 0.5, y + 0.5)], 'rgba(120, 70, 20, .05)');
    }
  }
  ctx.strokeStyle = 'rgba(150, 100, 50, .45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= room.w; i++) {
    const a = iso(i - 0.5, -0.5);
    const b = iso(i - 0.5, H);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let i = 0; i <= room.h; i++) {
    const a = iso(-0.5, i - 0.5);
    const b = iso(W, i - 0.5);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  // Reflexos da janela no piso brilhante.
  for (const [x, y, r] of [[5.2, 1.5, 46], [6.3, 2.6, 34], [7.3, 3.4, 26]]) {
    const p = iso(x, y);
    brilho(p.x, p.y, r, 'rgba(255, 255, 255, .28)', 0.45);
  }
  // Luz da luminária no chão.
  for (const f of room.furniture) {
    if (f.type !== 'lamp') continue;
    const p = iso(f.x, f.y);
    brilho(p.x, p.y, 120, 'rgba(255, 214, 140, .45)', 0.5);
  }
  ctx.restore();

  for (const f of room.furniture) if (f.type === 'rug') drawRug(f);
}

function drawRug(f) {
  const x0 = f.x - 0.45;
  const y0 = f.y - 0.45;
  const x1 = f.x + f.w - 0.55;
  const y1 = f.y + f.h - 0.55;
  const ret = (m, cor, borda) => poly([iso(x0 + m, y0 + m), iso(x1 - m, y0 + m), iso(x1 - m, y1 - m), iso(x0 + m, y1 - m)], cor, borda);
  ret(0, '#2a5298', 'rgba(15, 30, 70, .6)');
  ret(0.16, null, 'rgba(255,255,255,.75)');
  ret(0.2, '#2f5ca6');
  ret(0.62, '#d4a25c', 'rgba(120, 80, 30, .5)');
}

function drawCursor() {
  if (!hover) return;
  const pts = [iso(hover.x - 0.5, hover.y - 0.5), iso(hover.x + 0.5, hover.y - 0.5), iso(hover.x + 0.5, hover.y + 0.5), iso(hover.x - 0.5, hover.y + 0.5)];
  ctx.lineJoin = 'round';
  poly(pts, 'rgba(255,255,255,.15)', null);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.lineWidth = 1;
}

// ---------- Móveis ----------
function pernas(x, y, ex, ey, h, cor, grossura = 0.04) {
  for (const [dx, dy] of [[-ex, -ey], [ex, -ey], [-ex, ey], [ex, ey]]) isoBox(x + dx, y + dy, grossura, grossura, 0, h, cor);
}

function drawFurniture(f) {
  const { x, y } = f;
  if (f.type === 'sofa') {
    // Sofá de couro de dois lugares, encostado na parede do fundo.
    const cx = x + (f.w - 1) / 2;
    const ex = f.w / 2 - 0.06;
    const couro = '#b5212b';
    pernas(cx, y + 0.02, ex - 0.08, 0.3, 5, '#2a1a12');
    isoBox(cx, y - 0.26, ex, 0.14, 5, 36, shade(couro, -6));
    isoBox(cx, y + 0.04, ex, 0.4, 5, 12, shade(couro, -10));
    for (const lado of [-1, 1]) {
      const ax = cx + lado * (ex - 0.09);
      isoBox(ax, y + 0.04, 0.09, 0.4, 5, 24, shade(couro, -4));
    }
    const lugar = (ex - 0.2) / 2;
    for (const lado of [-1, 1]) {
      const sx = cx + lado * (lugar + 0.01);
      isoBox(sx, y + 0.08, lugar - 0.02, 0.3, 17, 7, couro);
      isoBox(sx, y - 0.14, lugar - 0.02, 0.07, 22, 24, shade(couro, 8));
    }
  } else if (f.type === 'table') {
    pernas(x, y, 0.34, 0.3, 24, '#5e3317', 0.05);
    isoBox(x, y, 0.44, 0.4, 24, 6, '#8a4f26');
    // Vaso de vidro com flores.
    isoBox(x + 0.05, y - 0.05, 0.06, 0.06, 30, 13, '#dfe9f3', 'rgba(80, 110, 140, .5)');
    const s = iso(x + 0.05, y - 0.05, 43);
    ctx.strokeStyle = '#3d8b3d';
    ctx.lineWidth = 1.2;
    for (const [dx, dy] of [[-5, -9], [0, -13], [5, -10], [-2, -6]]) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + dx, s.y + dy);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (const [dx, dy, c] of [[-5, -9, '#ff6f8f'], [0, -13, '#ffd2dc'], [5, -10, '#e8384f'], [-2, -6, '#ff9fb4']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === 'stool') {
    pernas(x, y, 0.17, 0.17, 15, '#5e3317', 0.035);
    isoBox(x, y, 0.24, 0.24, 15, 5, '#8a4f26');
  } else if (f.type === 'plant') {
    // Floreira de madeira com folhas pontudas.
    isoBox(x, y, 0.24, 0.24, 0, 24, '#9a5b2c');
    for (const z of [8, 16]) {
      poly([iso(x - 0.24, y + 0.24, z), iso(x + 0.24, y + 0.24, z)], null, 'rgba(60, 30, 10, .45)');
      poly([iso(x + 0.24, y + 0.24, z), iso(x + 0.24, y - 0.24, z)], null, 'rgba(60, 30, 10, .45)');
    }
    isoBox(x, y, 0.2, 0.2, 22, 2, '#4a2e1a');
    const s = iso(x, y, 24);
    const folhas = [];
    for (let i = 0; i < 11; i++) {
      const ang = -Math.PI / 2 + (i - 5) * 0.28;
      folhas.push({ ang, len: 30 - Math.abs(i - 5) * 2.5, cor: i % 2 ? '#2f7d32' : '#3f9b45' });
    }
    for (const fo of folhas) {
      const tx = s.x + Math.cos(fo.ang) * fo.len;
      const ty = s.y + Math.sin(fo.ang) * fo.len;
      const nx = -Math.sin(fo.ang) * 6;
      const ny = Math.cos(fo.ang) * 6;
      ctx.fillStyle = fo.cor;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo((s.x + tx) / 2 + nx, (s.y + ty) / 2 + ny, tx, ty);
      ctx.quadraticCurveTo((s.x + tx) / 2 - nx, (s.y + ty) / 2 - ny, s.x, s.y);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 60, 20, .5)';
      ctx.stroke();
    }
  } else if (f.type === 'lamp') {
    isoBox(x, y, 0.15, 0.15, 0, 4, '#1f1f24');
    isoBox(x, y, 0.025, 0.025, 4, 54, '#2a2a30');
    // Cúpula acesa (tronco de pirâmide).
    const zb = 58;
    const zt = 80;
    const b = 0.2;
    const t = 0.12;
    const P = (dx, dy, z) => iso(x + dx, y + dy, z);
    const halo = P(0, 0, 70);
    brilho(halo.x, halo.y, 60, 'rgba(255, 220, 150, .45)');
    poly([P(-b, b, zb), P(b, b, zb), P(t, t, zt), P(-t, t, zt)], '#ffe2a3', CONTORNO);
    poly([P(b, b, zb), P(b, -b, zb), P(t, -t, zt), P(t, t, zt)], '#f6cf7e', CONTORNO);
    poly([P(-t, -t, zt), P(t, -t, zt), P(t, t, zt), P(-t, t, zt)], '#fff6dc', CONTORNO);
  } else if (f.type === 'shelf') {
    isoBox(x, y - 0.22, 0.42, 0.2, 0, 92, '#6f3d1c');
    const cores = ['#c0392b', '#2e6fb7', '#e2b13c', '#2a8a5a', '#7d4bb3', '#d9692c', '#1f4f8a'];
    const y0 = y - 0.01;
    for (let fileira = 0; fileira < 4; fileira++) {
      const z0 = 6 + fileira * 21.5;
      poly([iso(x - 0.38, y0, z0), iso(x + 0.38, y0, z0), iso(x + 0.38, y0, z0 + 18), iso(x - 0.38, y0, z0 + 18)], '#3a1f0e');
      for (let i = 0; i < 7; i++) {
        const u = x - 0.36 + i * 0.104;
        const alt = 12 + ((i * 7 + fileira * 3) % 5);
        poly([iso(u, y0, z0), iso(u + 0.085, y0, z0), iso(u + 0.085, y0, z0 + alt), iso(u, y0, z0 + alt)], cores[(i + fileira * 2) % cores.length], 'rgba(0,0,0,.35)');
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
  const calca = '#2f4d86';
  const sapato = '#4a2c1b';

  c.save();
  // Sombra
  c.fillStyle = 'rgba(0,0,0,.25)';
  c.beginPath();
  c.ellipse(sx, sy, 14, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.translate(sx, sy + bob);
  if (!o.right) c.scale(-1, 1);
  c.lineWidth = 1.1;
  c.strokeStyle = 'rgba(30, 20, 20, .55)';
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
    c.translate(ombroX, -41);
    c.rotate(ang);
    rect(-3.5, -2, 7, 17, 3.5, frente ? cor : shade(cor, -30));
    rect(-2.8, 13.5, 5.6, 5.6, 2.8, frente ? PELE : shade(PELE, -25));
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
  rect(-6, -22 - passo * 2, 7, 20, 3, shade(calca, -22));
  rect(-7, -4 - passo * 2, 9, 4.5, 2, shade(sapato, -12));
  // Perna da frente (jeans com costura)
  rect(0, -22 + passo * 2, 7, 20, 3, calca);
  c.strokeStyle = 'rgba(255,255,255,.18)';
  c.beginPath();
  c.moveTo(3.5, -20 + passo * 2);
  c.lineTo(3.5, -4 + passo * 2);
  c.stroke();
  c.strokeStyle = 'rgba(30, 20, 20, .55)';
  rect(-1, -4 + passo * 2, 10, 4.5, 2, sapato);
  // Tronco com sombreado
  const g = c.createLinearGradient(-9, 0, 9, 0);
  g.addColorStop(0, shade(o.shirt, 14));
  g.addColorStop(1, shade(o.shirt, -22));
  rect(-9, -45, 18, 26, 6, g);
  c.fillStyle = shade(calca, -10);
  c.fillRect(-8.5, -21, 17, 2);
  if (o.front) {
    // Gola em V
    c.fillStyle = PELE;
    c.beginPath();
    c.moveTo(-2, -45);
    c.lineTo(5, -45);
    c.lineTo(1.5, -39);
    c.closePath();
    c.fill();
  }
  // Braço da frente
  braco(7, angFrente, o.shirt, true);

  // Cabeça
  c.fillStyle = PELE;
  c.beginPath();
  c.ellipse(1, -56, 10.5, 11.5, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  if (o.front) {
    // Orelha
    c.fillStyle = shade(PELE, -18);
    c.beginPath();
    c.ellipse(-8, -55, 2.4, 3.4, 0, 0, Math.PI * 2);
    c.fill();
    // Olhos com brilho (fecham ao piscar)
    for (const ox of [3.2, 8.2]) {
      if (o.blink) {
        c.fillStyle = '#2a1d16';
        c.fillRect(ox - 1.6, -56, 3.2, 1);
      } else {
        c.fillStyle = '#fff';
        c.beginPath();
        c.ellipse(ox, -56, 1.6, 2.1, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#2a1d16';
        c.beginPath();
        c.arc(ox + 0.4, -55.7, 1.15, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Sobrancelhas
    c.strokeStyle = o.hair;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(1.6, -60);
    c.lineTo(4.8, -60.6);
    c.moveTo(6.8, -60.6);
    c.lineTo(9.8, -60);
    c.stroke();
    // Nariz e sorriso
    c.strokeStyle = shade(PELE, -45);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(7.2, -54);
    c.lineTo(8.4, -52.4);
    c.stroke();
    c.strokeStyle = '#a5524a';
    c.beginPath();
    c.arc(5.8, -51.5, 2.2, 0.25, Math.PI - 0.6);
    c.stroke();
    c.lineWidth = 1.1;
    c.strokeStyle = 'rgba(30, 20, 20, .55)';
  }
  // Cabelo com topete
  c.fillStyle = o.hair;
  c.beginPath();
  if (o.front) {
    c.moveTo(-9.8, -52);
    c.quadraticCurveTo(-13, -70, 0, -69.5);
    c.quadraticCurveTo(13, -70, 12, -60);
    c.quadraticCurveTo(10, -64, 4, -63.5);
    c.quadraticCurveTo(-1, -63, -3, -60);
    c.quadraticCurveTo(-5, -56, -6, -51);
    c.closePath();
  } else {
    c.ellipse(1, -58, 11, 11, 0, Math.PI * 0.95, Math.PI * 2.05);
    c.lineTo(11, -51);
    c.quadraticCurveTo(1, -46, -9, -51);
    c.closePath();
  }
  c.fill();
  c.stroke();
  // Brilho no cabelo
  c.strokeStyle = 'rgba(255,255,255,.22)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(1, -60, 7, Math.PI * 1.15, Math.PI * 1.45);
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
  ctx.font = `bold ${textPx(12)}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(p.name).width + textPx(16);
  const th = textPx(19);
  const ny = s.y - 80 - th / 2;
  ctx.fillStyle = p.id === myId ? '#2e8b3e' : 'rgba(24, 26, 36, .78)';
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(s.x - tw / 2, ny - th / 2, tw, th, th / 2);
  ctx.fill();
  ctx.stroke();
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
