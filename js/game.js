// 게임 진행: 버그 편대, 총알, 미사일, 목숨, 문제 흐름
import { getStage, GOAL, HINTS_PER_STAGE, LIVES } from './levels.js';
import { buildWave, divisorNums, pairOk } from './problems.js';
import { drawBug, drawShip, drawBackground, makeStars, bugColor, drawStar, FONT, SHIPS } from './art.js';
import { sfx, speak } from './audio.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const REVIEW_AFTER = 4; // 틀린 문제는 다른 문제 3개를 푼 다음에 다시 (웨이브마다 1씩 줄어듦)

export class Game {
  constructor(canvas, hooks) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.input = { dx: 0, dy: 0, fireHeld: false };
    this.ship = SHIPS[0];
    this.time = 0;
    this.state = 'idle';
    this.paused = false;
    this.frozen = false;
    this.bugs = [];
    this.bullets = [];
    this.missiles = [];
    this.particles = [];
    this.flashes = [];
    this.texts = [];
    this.banner = null;
    this.player = { x: 0, y: 0, inv: 0 };
    this._raf = 0;
    this._last = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // ---------- 화면 크기 ----------
  resize() {
    const rect = this.cv.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = rect.width;
    this.H = rect.height;
    this.cv.width = Math.round(this.W * dpr);
    this.cv.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.R = clamp(Math.min(this.W, this.H) * 0.055, 24, 48);
    this.S = clamp(Math.min(this.W, this.H) * 0.045, 22, 40);
    this.stars = makeStars(this.W, this.H);
    this.top = Math.max(110, this.H * 0.17) + this.R * 0.4;
    this.yMin = this.top + this.R * 5.6;
    this.yMax = this.H - this.S * 1.6;
    if (!this.player.x || this.state === 'idle') this.placePlayer();
    this.player.x = clamp(this.player.x, this.S, this.W - this.S);
    this.player.y = clamp(this.player.y, this.yMin, this.yMax);
  }

  placePlayer() {
    this.player.x = this.W / 2;
    this.player.y = Math.max(this.yMin, this.H * 0.82);
  }

  slotPos(bug) {
    const { col, row, cols } = bug.slot;
    const span = Math.min(this.W * 0.72, cols * this.R * 3.3);
    const sway = Math.sin(this.time * 0.55) * this.W * 0.07;
    const x = this.W / 2 - span / 2 + (cols === 1 ? span / 2 : (col * span) / (cols - 1)) + sway;
    const y = this.top + row * this.R * 2.8 + Math.sin(this.time * 2.2 + bug.seed) * 4;
    return { x, y };
  }

  // ---------- 진행 ----------
  start() {
    if (this._raf) return;
    this._last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.update(dt);
      this.render(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  idle() {
    this.state = 'idle';
    this.bugs = [];
    this.bullets = [];
    this.missiles = [];
    this.flashes = [];
    this.texts = [];
    this.banner = null;
    this.frozen = false;
    this.paused = false;
    this.placePlayer();
  }

  play(op, level) {
    this.stage = getStage(op, level);
    this.lives = LIVES;
    this.correct = 0;
    this.wrong = 0;
    this.retries = 0;
    this.hintsLeft = HINTS_PER_STAGE;
    this.hintUntil = 0;
    this.reviewQueue = [];
    this.particles = [];
    this.paused = false;
    this.frozen = false;
    this.player.inv = 0;
    this.placePlayer();
    this.nextWave();
  }

  nextWave() {
    const st = this.stage;
    this.first = null;
    this.second = null;
    this.bullets = [];
    this.missiles = [];
    this.missileTimer = 2.5;
    this.frozen = false;
    this.reviewQueue.forEach((r) => r.due--);
    const boss = this.correct === GOAL - 1;
    let forced = null;
    if (!boss) {
      const i = this.reviewQueue.findIndex((r) => r.due <= 0);
      if (i >= 0) forced = this.reviewQueue.splice(i, 1)[0];
    }
    const wave = buildWave(st, { forced, boss });
    this.wave = { forced, boss, review: !!forced };
    const bugs = [];
    const seed = () => Math.random() * 10;
    if (boss) {
      bugs.push({ slot: { col: 0, row: 0.3, cols: 1 }, num: wave.boss, kind: 'boss', hp: 3, maxHp: 3, rScale: 1.6, color: '#C9B8FF' });
      wave.nums.forEach((n, i) => bugs.push({ slot: { col: i, row: 1.5, cols: 5 }, num: n, kind: st.op === 'div' ? 'divisor' : 'normal' }));
    } else {
      const cols = st.op === 'div' ? 4 : 5;
      wave.nums.forEach((n, i) => bugs.push({ slot: { col: i % cols, row: Math.floor(i / cols), cols }, num: n, kind: st.op === 'div' ? 'dividend' : 'normal' }));
    }
    bugs.forEach((b, i) => {
      b.alive = true;
      b.seed = seed();
      b.color = b.color || (b.kind === 'dividend' ? '#FFC9A3' : b.kind === 'divisor' ? '#B9EDB3' : bugColor(i));
      b.r = this.R * (b.rScale || 1);
      b.enter = -i * 0.06;
      b.side = i % 2 ? 1 : -1;
      b.hitFlash = 0;
      b.gray = false;
      b.x = -999;
      b.y = -999;
    });
    this.bugs = bugs;
    this.updateGray();
    this.state = 'enter';
    if (boss) {
      this.showBanner('👾 보스 등장! 3번 맞혀요');
      sfx.boss();
    } else if (forced) this.showBanner('🔁 복습 문제!');
    this.emitHud();
  }

  updateGray() {
    const alive = this.bugs.filter((b) => b.alive);
    const { forced, boss } = this.wave;
    const st = this.stage;
    if (this.first == null) {
      if (boss) alive.forEach((b) => (b.gray = b.kind !== 'boss'));
      else if (st.op === 'div') alive.forEach((b) => (b.gray = !!forced && b.num !== forced.a));
      else alive.forEach((b) => (b.gray = !alive.some((o) => o !== b && pairOk(st, b.num, o.num, forced))));
    } else {
      alive.forEach((b) => (b.gray = !pairOk(st, this.first, b.num, forced)));
    }
  }

  killBug(bug) {
    bug.alive = false;
    this.burst(bug.x, bug.y, bug.color, bug.kind === 'boss' ? 40 : 18);
    sfx.pop();
    speak(bug.num);
    const dur = this.stage.memSec;
    this.flashes.push({ num: bug.num, x: clamp(bug.x, this.R * 2, this.W - this.R * 2), y: Math.max(bug.y, this.R * 2.5), t: 0, dur });
    if (this.first == null) {
      this.first = bug.num;
      if (this.stage.op === 'div' && !this.wave.boss) this.transformToDivisors();
      this.updateGray();
    } else {
      this.second = bug.num;
      this.state = 'reveal';
      this.revealT = dur + 0.2;
    }
    this.emitHud();
  }

  transformToDivisors() {
    const alive = this.bugs.filter((b) => b.alive);
    const nums = divisorNums(this.stage, this.first, alive.length, this.wave.forced);
    alive.forEach((b, i) => {
      b.num = nums[i];
      b.kind = 'divisor';
      b.color = '#B9EDB3';
      b.hitFlash = 0.3;
      this.sparkle(b.x, b.y);
    });
    sfx.magic();
  }

  // UI에서 4지선다 결과를 알려 준다
  answer(isCorrect) {
    if (isCorrect) {
      this.correct++;
      sfx.correct();
      this.confetti();
      this.floatText('정답! ⭐', this.W / 2, this.H * 0.45, '#FFE08A');
      if (this.correct >= GOAL) {
        this.state = 'clear';
        this.frozen = false;
        this.bugs.forEach((b) => (b.alive = false));
        this.emitHud();
        setTimeout(() => {
          sfx.levelup();
          this.hooks.onClear(this.result());
        }, 1400);
        return;
      }
      this.nextWave();
    } else {
      this.wrong++;
      sfx.wrong();
      this.reviewQueue.push({ a: this.first, b: this.second, due: REVIEW_AFTER });
      this.emitHud();
    }
  }

  // 오답 설명을 본 뒤 다음 문제로
  continueAfterWrong() {
    this.nextWave();
  }

  revive() {
    this.lives = LIVES;
    this.retries++;
    this.player.inv = 2.5;
    this.frozen = false;
    this.state = this.stateBeforeDead || 'play';
    this.emitHud();
  }

  result() {
    const base = this.wrong <= 2 ? 3 : this.wrong <= 5 ? 2 : 1;
    return { stars: Math.max(1, base - this.retries), wrong: this.wrong, retries: this.retries, hintsUsed: HINTS_PER_STAGE - this.hintsLeft };
  }

  useHint() {
    if (this.hintsLeft <= 0 || this.first == null || this.hintUntil > performance.now()) return false;
    this.hintsLeft--;
    this.hintUntil = performance.now() + 2000;
    this.emitHud();
    setTimeout(() => this.emitHud(), 2050);
    return true;
  }

  emitHud() {
    if (!this.stage) return;
    this.hooks.onHud({
      lives: this.lives,
      correct: this.correct,
      goal: GOAL,
      hints: this.hintsLeft,
      symbol: this.stage.op === 'add' ? '+' : this.stage.op === 'sub' ? '−' : this.stage.op === 'mul' ? '×' : '÷',
      a: this.first,
      b: this.second,
      showNums: this.hintUntil > performance.now(),
      canHint: this.hintsLeft > 0 && this.first != null,
    });
  }

  // ---------- 입력 ----------
  fire() {
    if (this.paused || this.frozen) return;
    if (!['enter', 'play', 'idle'].includes(this.state)) return;
    if (this.bullets.length >= 2 || (this.fireCd || 0) > 0) return;
    this.fireCd = 0.16;
    this.bullets.push({ x: this.player.x, y: this.player.y - this.S });
    sfx.shoot();
  }

  // ---------- 효과 ----------
  burst(x, y, color, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 260;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.5 + Math.random() * 0.5, color: i % 3 ? color : '#FFFFFF', size: 3 + Math.random() * 5, star: i % 4 === 0 });
    }
  }

  sparkle(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0, max: 0.6, color: '#FFF6A8', size: 6, star: true });
    }
  }

  confetti() {
    const cols = ['#FFB3D1', '#A9DCFF', '#FFE08A', '#B9EDB3', '#C9B8FF'];
    for (let i = 0; i < 60; i++) {
      this.particles.push({ x: this.W / 2 + (Math.random() - 0.5) * this.W * 0.5, y: this.H * 0.4, vx: (Math.random() - 0.5) * 500, vy: -200 - Math.random() * 400, life: 0, max: 1.2 + Math.random() * 0.6, color: cols[i % cols.length], size: 5 + Math.random() * 5, star: i % 2 === 0, grav: 600 });
    }
  }

  floatText(text, x, y, color = '#FFFFFF', size = 1) {
    this.texts.push({ text, x, y, t: 0, dur: 1.1, color, size });
  }

  showBanner(text) {
    this.banner = { text, t: 0, dur: 1.6 };
  }

  // ---------- 업데이트 ----------
  update(dt) {
    this.time += dt;
    // 효과는 멈춰 있어도 흘러가게
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.grav) p.vy += p.grav * dt;
      else {
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    if (this.paused || this.frozen) return;

    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < f.dur);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.dur);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }

    // 비행기
    const sp = Math.max(260, this.W * 0.42);
    const p = this.player;
    p.x = clamp(p.x + this.input.dx * sp * dt, this.S, this.W - this.S);
    p.y = clamp(p.y + this.input.dy * sp * 0.8 * dt, this.yMin, this.yMax);
    if (p.inv > 0) p.inv -= dt;
    this.fireCd = Math.max(0, (this.fireCd || 0) - dt);
    if (this.input.fireHeld) this.fire();

    // 총알
    const bsp = this.H * 1.4;
    for (const b of this.bullets) b.y -= bsp * dt;
    this.bullets = this.bullets.filter((b) => b.y > -20 && !b.dead);

    if (this.state === 'idle') return;

    // 버그
    let allIn = true;
    for (const bug of this.bugs) {
      if (!bug.alive) continue;
      bug.hitFlash = Math.max(0, bug.hitFlash - dt);
      const target = this.slotPos(bug);
      if (bug.enter < 1) {
        bug.enter = Math.min(1, bug.enter + dt / 0.9);
        allIn = allIn && bug.enter >= 1;
        const k = Math.max(0, bug.enter);
        const e = 1 - (1 - k) * (1 - k);
        const sx = target.x + bug.side * this.W * 0.3;
        const sy = -bug.r * 2;
        const cx = target.x + bug.side * this.W * 0.15;
        const cy = target.y + this.H * 0.28;
        const u = 1 - e;
        bug.x = u * u * sx + 2 * u * e * cx + e * e * target.x;
        bug.y = u * u * sy + 2 * u * e * cy + e * e * target.y;
      } else {
        bug.x = target.x;
        bug.y = target.y;
      }
    }
    if (this.state === 'enter' && allIn) this.state = 'play';

    // 총알과 버그 충돌
    if (this.state === 'play') {
      for (const b of this.bullets) {
        if (this.state !== 'play') break;
        for (const bug of this.bugs) {
          if (!bug.alive || bug.enter < 1 || b.dead) continue;
          const dx = b.x - bug.x;
          const dy = b.y - bug.y;
          if (dx * dx + dy * dy > bug.r * bug.r * 0.95) continue;
          b.dead = true;
          if (bug.gray) {
            sfx.clink();
            this.floatText('팅!', bug.x, bug.y - bug.r, '#E4E7EE', 0.6);
            for (let i = 0; i < 5; i++) this.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 200, vy: 80 + Math.random() * 120, life: 0, max: 0.3, color: '#FFFFFF', size: 3 });
          } else if (bug.kind === 'boss' && bug.hp > 1) {
            bug.hp--;
            bug.hitFlash = 0.25;
            sfx.bossHit();
            this.burst(b.x, b.y, bug.color, 8);
          } else {
            this.killBug(bug);
          }
          if (this.state !== 'play') break;
        }
      }
      this.bullets = this.bullets.filter((b) => !b.dead);
    }

    // 미사일
    const L = this.stage.level;
    if (this.state === 'play') {
      this.missileTimer -= dt;
      const maxM = 2 + Math.floor(L / 4);
      if (this.missileTimer <= 0) {
        const shooters = this.bugs.filter((b) => b.alive && b.enter >= 1);
        if (shooters.length && this.missiles.length < maxM) {
          const s = shooters[Math.floor(Math.random() * shooters.length)];
          const vy = this.H * (0.2 + 0.012 * L);
          const vx = clamp((p.x - s.x) * 0.25, -70, 70);
          this.missiles.push({ x: s.x, y: s.y + s.r * 0.8, vx, vy });
        }
        const base = 2.8 - 0.16 * (L - 1);
        this.missileTimer = base * (0.7 + Math.random() * 0.6);
      }
    }
    for (const m of this.missiles) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
    this.missiles = this.missiles.filter((m) => m.y < this.H + 20 && !m.dead);

    // 미사일과 비행기 충돌
    if (p.inv <= 0 && (this.state === 'play' || this.state === 'reveal')) {
      const hr = this.S * 0.7 + 8;
      for (const m of this.missiles) {
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        if (dx * dx + dy * dy < hr * hr) {
          m.dead = true;
          this.hurt();
          break;
        }
      }
    }

    // 두 번째 숫자를 보여 준 뒤 4지선다
    if (this.state === 'reveal') {
      this.revealT -= dt;
      if (this.revealT <= 0) {
        this.state = 'ask';
        this.frozen = true;
        this.missiles = [];
        this.bullets = [];
        this.hooks.onAsk({ stage: this.stage, a: this.first, b: this.second });
      }
    }
  }

  hurt() {
    this.lives--;
    this.player.inv = 2;
    sfx.hurt();
    this.burst(this.player.x, this.player.y, '#FF8FB0', 24);
    this.emitHud();
    if (this.lives <= 0) {
      this.stateBeforeDead = this.state;
      this.frozen = true;
      this.missiles = [];
      setTimeout(() => this.hooks.onOutOfLives(), 500);
    }
  }

  // ---------- 그리기 ----------
  render(dt) {
    const ctx = this.ctx;
    const { W, H } = this;
    drawBackground(ctx, W, H, this.stars, this.time, this.paused || this.frozen ? dt * 0.2 : dt);

    for (const bug of this.bugs) if (bug.alive) drawBug(ctx, bug, this.time, this.player.x);

    // 총알
    for (const b of this.bullets) {
      ctx.fillStyle = '#FFF6A8';
      ctx.shadowColor = '#FFE08A';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 4, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 미사일 (에너지 방울)
    for (const m of this.missiles) {
      const r = Math.max(7, this.R * 0.2);
      const g = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, r * 1.8);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.35, '#FF7FA8');
      g.addColorStop(1, 'rgba(255,127,168,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 비행기
    const p = this.player;
    if (!this.hideShip && !(p.inv > 0 && Math.floor(this.time * 12) % 2 === 0)) {
      drawShip(ctx, this.ship, p.x, p.y, this.S, this.time);
    }

    // 파티클
    for (const q of this.particles) {
      ctx.globalAlpha = 1 - q.life / q.max;
      ctx.fillStyle = q.color;
      if (q.star) drawStar(ctx, q.x, q.y, q.size, q.life * 6);
      else {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // 맞힌 숫자: 커졌다가 사라짐
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.flashes) {
      const k = f.t / f.dur;
      const scale = k < 0.25 ? 1 + (k / 0.25) * 1.4 : 2.4;
      const alpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const fs = this.R * 1.05 * scale;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, fs * 0.75 + String(f.num).length * fs * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${fs}px ${FONT}`;
      ctx.fillStyle = '#5B3FC4';
      ctx.fillText(String(f.num), f.x, f.y + fs * 0.05);
    }
    ctx.globalAlpha = 1;

    for (const t of this.texts) {
      const k = t.t / t.dur;
      ctx.globalAlpha = 1 - k;
      const fs = this.R * 1.1 * t.size;
      ctx.font = `${fs}px ${FONT}`;
      ctx.lineWidth = fs * 0.15;
      ctx.strokeStyle = 'rgba(43,42,94,0.8)';
      ctx.strokeText(t.text, t.x, t.y - k * 40);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y - k * 40);
    }
    ctx.globalAlpha = 1;

    if (this.banner) {
      const b = this.banner;
      const k = b.t / b.dur;
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const fs = clamp(W * 0.05, 26, 52);
      ctx.font = `${fs}px ${FONT}`;
      ctx.fillStyle = 'rgba(43,42,94,0.75)';
      const w = ctx.measureText(b.text).width + fs * 1.6;
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2, H * 0.5 - fs, w, fs * 2, fs);
      ctx.fill();
      ctx.fillStyle = '#FFE08A';
      ctx.fillText(b.text, W / 2, H * 0.5 + fs * 0.05);
      ctx.globalAlpha = 1;
    }
  }
}
