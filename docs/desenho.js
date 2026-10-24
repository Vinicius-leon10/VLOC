// Desenho da sala, dos móveis, dos avatares e dos balões, usando a arte em docs/arte/.
const FONTE = '"Ubuntu", system-ui, sans-serif';
const CONTORNO = 'rgba(30, 20, 14, .45)';
const PELE = '#f3c6a0';
const FUNDO = '#1f2237'; // mesma cor das bordas de arte/sala.jpg

// ---------- Imagens ----------
const IMG = {};
for (const nome of ['sala', 'sofa', 'estante', 'mesa', 'banco', 'planta', 'luminaria']) {
  IMG[nome] = new Image();
  IMG[nome].src = `arte/${nome}.${nome === 'sala' ? 'jpg' : 'png'}`;
}
const pronta = (nome) => IMG[nome].complete && IMG[nome].naturalWidth > 0;

// Imagens de cada estilo de cabelo, baixadas só quando alguém usa o estilo.
function estiloValido(estilo) {
  return Object.hasOwn(ARTE.avatar.estilos, estilo) ? estilo : 'padrao';
}

function imagensEstilo(estilo) {
  const base = ARTE.avatar.estilos[estilo].arquivo;
  for (const nome of [base, `${base}-camisa`, `${base}-cabelo`]) {
    if (!IMG[nome]) {
      IMG[nome] = new Image();
      IMG[nome].src = `arte/${nome}.png`;
    }
  }
  return [base, `${base}-camisa`, `${base}-cabelo`];
}

// ---------- Utilitários ----------
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

// Ponto na tela para uma posição (x, y) do piso (aceita frações de ladrilho).
function iso(x, y) {
  return toScreen(x, y);
}

function ladrilho(x0, y0, x1, y1) {
  return [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)];
}

// Brilho suave e redondo.
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
  ctx.fillStyle = FUNDO;
  ctx.fillRect(0, 0, innerWidth / scale, innerHeight / scale);
  if (pronta('sala')) ctx.drawImage(IMG.sala, origin.x, origin.y, ARTE.sala.w, ARTE.sala.h);
}

function drawFloor() {
  for (const f of room.furniture) {
    if (f.type === 'tapete') drawRug(f);
    if (f.type === 'luminaria') {
      const p = iso(f.x, f.y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      brilho(p.x, p.y, 110, 'rgba(255, 190, 110, .28)', 0.55);
      ctx.restore();
    }
  }
}

function drawRug(f) {
  const x0 = f.x - 0.45;
  const y0 = f.y - 0.45;
  const x1 = f.x + f.w - 0.55;
  const y1 = f.y + f.h - 0.55;
  const ret = (m) => ladrilho(x0 + m, y0 + m, x1 - m, y1 - m);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 6;
  poly(ret(0), '#2a4f93');
  ctx.restore();
  poly(ret(0.15), null, 'rgba(255,255,255,.8)');
  poly(ret(0.19), '#2d58a3');
  poly(ret(0.6), '#cf9f5c', 'rgba(110, 70, 30, .4)');
}

function drawCursor() {
  if (!hover) return;
  const pts = ladrilho(hover.x - 0.5, hover.y - 0.5, hover.x + 0.5, hover.y + 0.5);
  ctx.lineJoin = 'round';
  poly(pts, 'rgba(255,255,255,.18)', null);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.lineWidth = 1;
}

// ---------- Móveis ----------
function drawFurniture(f) {
  if (!pronta(f.type)) return;
  const m = ARTE[f.type];
  // Centro da pegada do móvel (o sofá ocupa 2 quadrados; a estante encosta na parede).
  const cx = f.x + ((f.w || 1) - 1) / 2 + (f.dx || 0);
  const cy = f.y + (f.dy || 0);
  const p = iso(cx, cy);
  ctx.drawImage(IMG[f.type], p.x - m.ax, p.y - m.ay, m.w, m.h);
}

// ---------- Avatar ----------
// Cada combinação de quadro + cores vira um canvas pintado uma vez e reaproveitado.
const avatarCache = new Map();

function quadroPintado(estilo, i, camisa, cabelo) {
  const chave = `${estilo}|${i}|${camisa}|${cabelo}`;
  if (avatarCache.has(chave)) return avatarCache.get(chave);
  const [base, camadaCamisa, camadaCabelo] = imagensEstilo(estilo);
  if (!pronta(base) || !pronta(camadaCamisa) || !pronta(camadaCabelo)) return null;
  const q = ARTE.avatar.estilos[estilo].quadros[i];
  const out = document.createElement('canvas');
  out.width = q.w;
  out.height = q.h;
  const o = out.getContext('2d');
  o.drawImage(IMG[base], q.x, 0, q.w, q.h, 0, 0, q.w, q.h);
  for (const [camada, cor] of [[camadaCamisa, camisa], [camadaCabelo, cabelo]]) {
    const t = document.createElement('canvas');
    t.width = q.w;
    t.height = q.h;
    const g = t.getContext('2d');
    g.drawImage(IMG[camada], q.x, 0, q.w, q.h, 0, 0, q.w, q.h);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = cor;
    g.fillRect(0, 0, q.w, q.h);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(IMG[camada], q.x, 0, q.w, q.h, 0, 0, q.w, q.h);
    o.drawImage(t, 0, 0);
  }
  if (avatarCache.size > 300) avatarCache.clear();
  avatarCache.set(chave, out);
  return out;
}

// Desenha um avatar com os pés em (sx, sy). o = { estilo, shirt, hair, front, right, walk, acao, t }
// Os quadros originais olham para a direita; para a esquerda, espelha.
function drawAvatar(c, sx, sy, o, tamanho = 1) {
  const A = ARTE.avatar;
  const t = o.t || 0;
  let i;
  if (o.acao === 'dancar') i = A.dancar[Math.floor(t / 380) % A.dancar.length];
  else if (o.acao === 'acenar') i = A.acenar[0];
  else if (o.walk) i = (o.front ? A.andar : A.andarCostas)[Math.floor(t / 140) % 4];
  else i = o.front ? A.parado : A.paradoCostas;
  const estilo = estiloValido(o.estilo);
  const img = quadroPintado(estilo, i, o.shirt, o.hair);
  if (!img) return;
  const q = A.estilos[estilo].quadros[i];
  const k = (A.altura / A.px) * tamanho;
  c.save();
  c.translate(sx, sy);
  if (!o.right) c.scale(-1, 1);
  c.drawImage(img, -q.ax * k, -q.ay * k, q.w * k, q.h * k);
  c.restore();
}

function drawPlayer(p, now) {
  const s = toScreen(p.drawX, p.drawY);
  const walking = Math.abs(p.drawX - p.x) + Math.abs(p.drawY - p.y) > 0.03 || p.path.length > 0;
  if (p.acao === 'acenar' && now > p.acaoAte) p.acao = null;
  drawAvatar(ctx, s.x, s.y, {
    estilo: p.estilo,
    shirt: p.color,
    hair: p.hair || '#3a2216',
    front: p.front !== false,
    right: !!p.right,
    walk: walking,
    acao: walking ? null : p.acao,
    t: now + (p.fase || 0),
  });
  // Nome acima da cabeça, como na referência.
  // No celular a sala fica pequena, então a etiqueta também diminui.
  const fs = scale < 0.6 ? 10 : 12;
  ctx.font = `bold ${textPx(fs)}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(p.name).width + textPx(fs * 1.4);
  const th = textPx(fs * 1.7);
  const ny = s.y - ARTE.avatar.altura - textPx(8) - th / 2;
  ctx.fillStyle = p.id === myId ? '#2f8a3f' : 'rgba(24, 26, 36, .8)';
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(s.x - tw / 2, ny - th / 2, tw, th, th / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillText(p.name, s.x, ny + 0.5);
  ctx.textBaseline = 'alphabetic';
}

// Tamanho de texto em pixels do mundo para aparecer com ~px pixels na tela.
function textPx(px) {
  return px / Math.min(scale, 1);
}

// ---------- Chat (balões que sobem, como no Habbo) ----------
function drawChat(now) {
  if (chatLines.length && now - lastScroll > CHAT_SCROLL_MS) {
    chatLines.forEach((l) => l.row++);
    lastScroll = now;
  }
  const rowH = textPx(CHAT_ROW_H);
  const baseY = origin.y + ARTE.sala.cantos.B[1] - rowH;
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
  drawFloor();
  drawCursor();
  // Interpola posição para o movimento ficar suave.
  for (const p of players.values()) {
    p.drawX += (p.x - p.drawX) * 0.2;
    p.drawY += (p.y - p.drawY) * 0.2;
  }
  // Ordena móveis e avatares por profundidade (x + y).
  const items = [
    ...room.furniture.filter((f) => f.type !== 'tapete').map((f) => ({ depth: f.x + (f.w || 1) - 1 + f.y, draw: () => drawFurniture(f) })),
    ...[...players.values()].map((p) => ({ depth: p.drawX + p.drawY + 0.01, draw: () => drawPlayer(p, now) })),
  ].sort((a, b) => a.depth - b.depth);
  items.forEach((it) => it.draw());
  drawChat(now);
  requestAnimationFrame(frame);
}
