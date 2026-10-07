// 화면 방향키 + 발사 버튼 (위치·크기 바꾸기, 좌우 반전)
const PAD = 180;
const FIRE = 130;

export class Controls {
  constructor(root, game, { getLayout, saveLayout }) {
    this.root = root;
    this.game = game;
    this.getLayout = getLayout;
    this.saveLayout = saveLayout;
    this.pad = root.querySelector('#pad');
    this.fireBtn = root.querySelector('#fire');
    this.padActive = false;
    this.editing = false;
    this.bindPad();
    this.bindFire();
    this.bindDrag(this.pad, 'pad');
    this.bindDrag(this.fireBtn, 'fire');
    window.addEventListener('resize', () => this.apply());
  }

  apply() {
    const L = this.getLayout();
    const rect = this.root.getBoundingClientRect();
    const place = (el, pos, size) => {
      const s = size * L.scale;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      const half = s / 2;
      el.style.left = `${Math.max(half, Math.min(rect.width - half, pos.x * rect.width))}px`;
      el.style.top = `${Math.max(half, Math.min(rect.height - half, pos.y * rect.height))}px`;
    };
    place(this.pad, L.pad, PAD);
    place(this.fireBtn, L.fire, FIRE);
  }

  setEditing(on) {
    this.editing = on;
    this.root.classList.toggle('editing', on);
    this.release();
  }

  release() {
    this.padActive = false;
    this.game.input.dx = 0;
    this.game.input.dy = 0;
    this.game.input.fireHeld = false;
    this.pad.dataset.dir = '';
    this.fireBtn.classList.remove('down');
  }

  bindPad() {
    let id = null;
    const move = (e) => {
      const r = this.pad.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m < 0.18) dx = dy = 0;
      else if (m > 1) {
        dx /= m;
        dy /= m;
      }
      // 거의 한 방향이면 그 방향으로 딱 맞춰 준다 (아이들이 미는 방향이 조금 비뚤어도 OK)
      if (Math.abs(dx) > Math.abs(dy) * 2.2) dy = 0;
      else if (Math.abs(dy) > Math.abs(dx) * 2.2) dx = 0;
      const n = Math.hypot(dx, dy) || 1;
      this.game.input.dx = dx ? dx / n : 0;
      this.game.input.dy = dy ? dy / n : 0;
      this.pad.dataset.dir = `${dy < 0 ? 'u' : dy > 0 ? 'd' : ''}${dx < 0 ? 'l' : dx > 0 ? 'r' : ''}`;
    };
    this.pad.addEventListener('pointerdown', (e) => {
      if (this.editing) return;
      e.preventDefault();
      id = e.pointerId;
      this.pad.setPointerCapture(id);
      this.padActive = true;
      move(e);
    });
    this.pad.addEventListener('pointermove', (e) => {
      if (e.pointerId === id && !this.editing) move(e);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.padActive = false;
      this.game.input.dx = 0;
      this.game.input.dy = 0;
      this.pad.dataset.dir = '';
    };
    this.pad.addEventListener('pointerup', end);
    this.pad.addEventListener('pointercancel', end);
  }

  bindFire() {
    this.fireBtn.addEventListener('pointerdown', (e) => {
      if (this.editing) return;
      e.preventDefault();
      this.fireBtn.setPointerCapture(e.pointerId);
      this.fireBtn.classList.add('down');
      this.game.input.fireHeld = true;
      this.game.fire();
    });
    const end = () => {
      this.fireBtn.classList.remove('down');
      this.game.input.fireHeld = false;
    };
    this.fireBtn.addEventListener('pointerup', end);
    this.fireBtn.addEventListener('pointercancel', end);
  }

  bindDrag(el, key) {
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (!this.editing) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      drag = { id: e.pointerId, ox: e.clientX - (r.left + r.width / 2), oy: e.clientY - (r.top + r.height / 2) };
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const rr = this.root.getBoundingClientRect();
      const L = this.getLayout();
      L[key] = {
        x: Math.max(0.03, Math.min(0.97, (e.clientX - drag.ox - rr.left) / rr.width)),
        y: Math.max(0.1, Math.min(0.97, (e.clientY - drag.oy - rr.top) / rr.height)),
      };
      this.apply();
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      this.saveLayout();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  swapSides() {
    const L = this.getLayout();
    L.pad = { x: 1 - L.pad.x, y: L.pad.y };
    L.fire = { x: 1 - L.fire.x, y: L.fire.y };
    this.apply();
    this.saveLayout();
  }

  resize(delta) {
    const L = this.getLayout();
    L.scale = Math.max(0.7, Math.min(1.5, Math.round((L.scale + delta) * 10) / 10));
    this.apply();
    this.saveLayout();
  }
}
