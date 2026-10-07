// 캔버스 그림: 귀여운 버그, 비행기, 배경
export const FONT = "'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

export const SHIPS = [
  { id: 'basic', name: '꼬마 로켓', need: 0, body: '#FFFFFF', accent: '#FF8FBF', glass: '#8FD8FF' },
  { id: 'mint', name: '민트 제트', need: 8, body: '#C8F5E4', accent: '#3CC79A', glass: '#FFFFFF', wings: 'swept' },
  { id: 'star', name: '별빛 호', need: 20, body: '#FFF3B0', accent: '#FFB020', glass: '#B9A4FF', star: true },
  { id: 'cat', name: '냥냥 로켓', need: 35, body: '#FFD9C2', accent: '#FF8A5C', glass: '#FFFFFF', ears: true },
  { id: 'rainbow', name: '무지개 호', need: 55, body: '#FFFFFF', accent: 'rainbow', glass: '#FFB3D1' },
  { id: 'ufo', name: '꼬마 UFO', need: 80, body: '#D6C8FF', accent: '#8A6CFF', glass: '#A9F0FF', ufo: true },
];

const BUG_COLORS = ['#FFB3D1', '#A9DCFF', '#FFE08A', '#C9B8FF', '#FFC9A3', '#B9EDB3'];
export const bugColor = (i) => BUG_COLORS[i % BUG_COLORS.length];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** bug: {x, y, r, num, color, gray, kind:'normal'|'dividend'|'divisor'|'boss', hp, hit, t} */
export function drawBug(ctx, bug, time, lookX) {
  const { x, y, r } = bug;
  const gray = bug.gray;
  const flap = Math.sin(time * 14 + bug.seed) * 0.25;
  ctx.save();
  ctx.translate(x, y);
  if (bug.hitFlash > 0) ctx.translate((Math.random() - 0.5) * 6, 0);

  // 날개
  ctx.fillStyle = gray ? 'rgba(200,205,215,0.55)' : 'rgba(255,255,255,0.7)';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * (0.5 + flap));
    ctx.beginPath();
    ctx.ellipse(s * r * 0.95, -r * 0.25, r * 0.55, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 더듬이
  const body = gray ? '#A3A9B8' : bug.color;
  ctx.strokeStyle = gray ? '#7D8394' : '#5B4B8A';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.3, -r * 0.8);
    ctx.quadraticCurveTo(s * r * 0.5, -r * 1.35, s * r * 0.7, -r * 1.25);
    ctx.stroke();
    ctx.fillStyle = gray ? '#7D8394' : bug.kind === 'divisor' ? '#FFFFFF' : '#FF7FB0';
    if (bug.kind === 'divisor' && !gray) drawStar(ctx, s * r * 0.72, -r * 1.27, r * 0.2);
    else {
      ctx.beginPath();
      ctx.arc(s * r * 0.72, -r * 1.27, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 몸통
  ctx.fillStyle = body;
  ctx.strokeStyle = gray ? '#6E7486' : 'rgba(91,75,138,0.55)';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.25, r * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // 눈
  const ey = -r * 0.45;
  const look = Math.max(-1, Math.min(1, (lookX - x) / 300)) * r * 0.06;
  for (const s of [-1, 1]) {
    if (gray) {
      ctx.strokeStyle = '#5E6474';
      ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.beginPath();
      ctx.moveTo(s * r * 0.3 - r * 0.1, ey);
      ctx.lineTo(s * r * 0.3 + r * 0.1, ey);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s * r * 0.3, ey, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2E2550';
      ctx.beginPath();
      ctx.arc(s * r * 0.3 + look, ey + r * 0.02, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,120,160,0.45)';
      ctx.beginPath();
      ctx.ellipse(s * r * 0.58, ey + r * 0.22, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 숫자
  const label = String(bug.num);
  const fs = r * (label.length <= 1 ? 0.95 : label.length === 2 ? 0.8 : 0.62);
  ctx.font = `${fs}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = fs * 0.16;
  ctx.strokeStyle = gray ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)';
  ctx.strokeText(label, 0, r * 0.25);
  ctx.fillStyle = gray ? '#E4E7EE' : '#3A2E66';
  ctx.fillText(label, 0, r * 0.25);

  // 철갑 표시
  if (gray) {
    ctx.fillStyle = '#6E7486';
    for (const [px, py] of [[-0.72, 0.1], [0.72, 0.1], [0, 0.78]]) {
      ctx.beginPath();
      ctx.arc(px * r, py * r, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 보스: 왕관과 체력
  if (bug.kind === 'boss') {
    ctx.fillStyle = '#FFD24D';
    ctx.strokeStyle = '#D99A12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const cw = r * 0.7;
    const cy = -r * 0.95;
    ctx.moveTo(-cw, cy);
    ctx.lineTo(-cw, cy - r * 0.35);
    ctx.lineTo(-cw * 0.5, cy - r * 0.15);
    ctx.lineTo(0, cy - r * 0.45);
    ctx.lineTo(cw * 0.5, cy - r * 0.15);
    ctx.lineTo(cw, cy - r * 0.35);
    ctx.lineTo(cw, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < bug.maxHp; i++) {
      ctx.fillStyle = i < bug.hp ? '#FF6F9C' : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc((i - (bug.maxHp - 1) / 2) * r * 0.35, r * 1.2, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (bug.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, bug.hitFlash * 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawStar(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function accentFill(ctx, ship, x0, x1) {
  if (ship.accent !== 'rainbow') return ship.accent;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  ['#FF8FB0', '#FFC36B', '#FFE66B', '#8DE08A', '#7CC8FF', '#B79BFF'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
  return g;
}

/** 비행기 그리기. s = 크기(높이 기준 반지름) */
export function drawShip(ctx, ship, x, y, s, time = 0, thrust = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  // 불꽃
  if (thrust) {
    const fl = s * (0.45 + Math.sin(time * 30) * 0.1);
    const g = ctx.createLinearGradient(0, s * 0.6, 0, s * 0.6 + fl);
    g.addColorStop(0, '#FFF6A8');
    g.addColorStop(1, 'rgba(255,140,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, s * 0.6);
    ctx.quadraticCurveTo(0, s * 0.6 + fl * 1.6, s * 0.22, s * 0.6);
    ctx.fill();
  }
  const outline = 'rgba(58,46,102,0.75)';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.strokeStyle = outline;

  if (ship.ufo) {
    ctx.fillStyle = accentFill(ctx, ship, -s, s);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.2, s * 1.05, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ship.glass;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.05, s * 0.5, s * 0.5, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF6A8';
    for (const px of [-0.6, 0, 0.6]) {
      ctx.beginPath();
      ctx.arc(px * s, s * 0.28, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 날개
  ctx.fillStyle = accentFill(ctx, ship, -s, s);
  for (const k of [-1, 1]) {
    ctx.beginPath();
    if (ship.wings === 'swept') {
      ctx.moveTo(k * s * 0.3, -s * 0.1);
      ctx.lineTo(k * s * 1.0, s * 0.55);
      ctx.lineTo(k * s * 0.3, s * 0.45);
    } else {
      ctx.moveTo(k * s * 0.3, s * 0.0);
      ctx.quadraticCurveTo(k * s * 0.95, s * 0.25, k * s * 0.85, s * 0.6);
      ctx.lineTo(k * s * 0.3, s * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 고양이 귀
  if (ship.ears) {
    ctx.fillStyle = ship.accent;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(k * s * 0.12, -s * 0.72);
      ctx.lineTo(k * s * 0.32, -s * 1.05);
      ctx.lineTo(k * s * 0.4, -s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // 몸통
  ctx.fillStyle = ship.body;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.0);
  ctx.bezierCurveTo(s * 0.45, -s * 0.7, s * 0.45, s * 0.3, s * 0.3, s * 0.65);
  ctx.lineTo(-s * 0.3, s * 0.65);
  ctx.bezierCurveTo(-s * 0.45, s * 0.3, -s * 0.45, -s * 0.7, 0, -s * 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 창문
  ctx.fillStyle = ship.glass;
  ctx.beginPath();
  ctx.arc(0, -s * 0.25, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(-s * 0.06, -s * 0.31, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  if (ship.star) {
    ctx.fillStyle = ship.accent;
    drawStar(ctx, 0, s * 0.3, s * 0.18);
  } else {
    ctx.fillStyle = accentFill(ctx, ship, -s * 0.3, s * 0.3);
    rr(ctx, -s * 0.3, s * 0.2, s * 0.6, s * 0.14, s * 0.07);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- 배경 ----------
export function makeStars(W, H) {
  const stars = [];
  const n = Math.round((W * H) / 9000);
  const cols = ['#FFFFFF', '#FFD6E8', '#D6ECFF', '#FFF3C4'];
  for (let i = 0; i < n; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + 0.4, sp: Math.random() * 20 + 8, tw: Math.random() * 6, c: cols[i % cols.length] });
  }
  return stars;
}

export function drawBackground(ctx, W, H, stars, time, dt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2B2A5E');
  g.addColorStop(0.55, '#4B3F86');
  g.addColorStop(1, '#7A5AA6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 행성
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#FFB3D1';
  ctx.beginPath();
  ctx.arc(W * 0.9, H * 0.5, Math.min(W, H) * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFE08A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(W * 0.9, H * 0.5, Math.min(W, H) * 0.12, Math.min(W, H) * 0.025, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#A9DCFF';
  ctx.beginPath();
  ctx.arc(W * 0.06, H * 0.4, Math.min(W, H) * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const s of stars) {
    s.y += s.sp * dt;
    if (s.y > H) {
      s.y = -2;
      s.x = Math.random() * W;
    }
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2 + s.tw);
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
