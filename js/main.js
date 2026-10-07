// 화면 전환, 프로필, 모달(4지선다·오답 설명·다시 도전·클리어)
import { OPS, OP_ORDER, stageCount, stageInfo, answerOf, answerLabel, GOAL, LIVES } from './levels.js';
import { makeChoices, pictureable } from './problems.js';
import { Game } from './game.js';
import { Controls } from './controls.js';
import { SHIPS, drawBug, drawShip } from './art.js';
import { audioPrefs, unlockAudio, sfx, speak } from './audio.js';
import { load, save, newProfile, defaultLayout, stageKey, totalStars, isUnlocked } from './storage.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const AVATARS = ['🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐸', '🐯', '🐧', '🦄', '🐹', '🐨'];

const data = load();
let profile = data.profiles.find((p) => p.id === data.currentId) || null;
let current = null; // { op, level }
const persist = () => save(data);

// ---------- 게임 ----------
const gameScreen = $('#scr-game');
const game = new Game($('#cv'), {
  onHud: renderHud,
  onAsk: showChoice,
  onOutOfLives: showRevive,
  onClear: showClear,
});
game.hideShip = true;
const controls = new Controls(gameScreen, game, {
  getLayout: () => (profile ? profile.layout : defaultLayout()),
  saveLayout: persist,
});
game.start();
if (location.hostname === 'localhost') window.__game = game; // 개발 중 확인용

// ---------- 화면 전환 ----------
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `scr-${id}`));
  closeModal();
  if (id !== 'game') {
    game.idle();
    game.hideShip = true;
    controls.setEditing(false);
  }
  ({ profile: renderProfiles, home: renderHome, stages: renderStages, hangar: renderHangar, settings: renderSettings })[id]?.();
}
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); show(b.dataset.back); }));

function applyProfile() {
  audioPrefs.sound = profile.sound;
  audioPrefs.voice = profile.voice;
  profile.layout = profile.layout || defaultLayout();
  game.ship = SHIPS.find((s) => s.id === profile.ship) || SHIPS[0];
}

// ---------- 프로필 ----------
function drawLogo() {
  const c = $('.logo-bug');
  const ctx = c.getContext('2d');
  let t = 0;
  const tick = () => {
    if (!$('#scr-profile').classList.contains('active')) return;
    t += 1 / 60;
    ctx.clearRect(0, 0, 120, 120);
    drawBug(ctx, { x: 60, y: 66, r: 34, num: '?', color: '#FFB3D1', seed: 1, hitFlash: 0 }, t, 60 + Math.sin(t) * 200);
    requestAnimationFrame(tick);
  };
  tick();
}

function renderProfiles() {
  const list = $('#profile-list');
  list.innerHTML = '';
  for (const p of data.profiles) {
    const b = document.createElement('button');
    b.className = 'profile';
    b.innerHTML = `<span class="av">${p.avatar}</span>${esc(p.name)}<br><span class="st">⭐ ${totalStars(p)}</span>`;
    b.onclick = () => {
      sfx.tap();
      profile = p;
      data.currentId = p.id;
      persist();
      applyProfile();
      show('home');
    };
    list.appendChild(b);
  }
  const add = document.createElement('button');
  add.className = 'profile add';
  add.innerHTML = '<span class="av">➕</span>새 친구';
  add.onclick = () => { sfx.tap(); showNewProfile(); };
  list.appendChild(add);
  drawLogo();
}

function showNewProfile() {
  let avatar = AVATARS[data.profiles.length % AVATARS.length];
  openModal(`
    <h2>새 친구 만들기</h2>
    <p>이름(별명)을 써 주세요</p>
    <input class="name-input" id="np-name" maxlength="8" placeholder="예: 지우" autocomplete="off">
    <div class="avatars" id="np-av">${AVATARS.map((a) => `<button data-a="${a}" class="${a === avatar ? 'on' : ''}">${a}</button>`).join('')}</div>
    <div class="modal-actions">
      <button class="big-btn alt" id="np-cancel">취소</button>
      <button class="big-btn" id="np-ok">만들기</button>
    </div>`);
  $('#np-av').onclick = (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (!a) return;
    avatar = a;
    $('#np-av').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.a === a));
  };
  $('#np-cancel').onclick = closeModal;
  $('#np-ok').onclick = () => {
    const name = $('#np-name').value.trim() || `친구 ${data.profiles.length + 1}`;
    const p = newProfile(name, avatar);
    data.profiles.push(p);
    data.currentId = p.id;
    profile = p;
    persist();
    applyProfile();
    show('home');
  };
  setTimeout(() => $('#np-name')?.focus(), 50);
}

// ---------- 연산 선택 ----------
function renderHome() {
  $('#btn-who').textContent = `${profile.avatar} ${profile.name}`;
  $('#home-stars').textContent = totalStars(profile);
  const list = $('#op-list');
  list.innerHTML = '';
  for (const op of OP_ORDER) {
    const o = OPS[op];
    const n = stageCount(op);
    let cleared = 0;
    for (let i = 1; i <= n; i++) if (profile.stars[stageKey(op, i)]) cleared++;
    const b = document.createElement('button');
    b.className = 'op-card';
    b.style.background = o.color;
    b.innerHTML = `<span class="sym">${o.symbol}</span><span class="nm">${o.name}</span><span class="pg">${cleared} / ${n} 단계</span>`;
    b.onclick = () => { sfx.tap(); current = { op }; show('stages'); };
    list.appendChild(b);
  }
}
$('#btn-who').onclick = () => { sfx.tap(); show('profile'); };
$('#btn-hangar').onclick = () => { sfx.tap(); show('hangar'); };
$('#btn-settings').onclick = () => { sfx.tap(); show('settings'); };

// ---------- 단계 선택 ----------
function renderStages() {
  const o = OPS[current.op];
  $('#stages-title').textContent = `${o.symbol} ${o.name}`;
  const list = $('#stage-list');
  list.innerHTML = '';
  for (let lv = 1; lv <= stageCount(current.op); lv++) {
    const info = stageInfo(current.op, lv);
    const open = isUnlocked(profile, current.op, lv);
    const st = profile.stars[stageKey(current.op, lv)] || 0;
    const b = document.createElement('button');
    b.className = `stage${open ? '' : ' locked'}`;
    b.innerHTML = `<span class="lv" style="background:${open ? o.deep : '#b5afcc'}">${lv}단계</span>
      <span class="tt">${info.title}</span><span class="ex">${info.ex}</span>
      <span class="sr">${open ? '⭐'.repeat(st) + '<span style="opacity:.25">' + '⭐'.repeat(3 - st) + '</span>' : '🔒'}</span>`;
    if (open) b.onclick = () => { sfx.tap(); startStage(current.op, lv); };
    list.appendChild(b);
  }
}

function startStage(op, level) {
  current = { op, level };
  show('game');
  game.hideShip = false;
  game.resize();
  controls.apply();
  game.play(op, level);
}

// ---------- HUD ----------
let lastHud = null;
function renderHud(h) {
  lastHud = h;
  $('#hud-lives').innerHTML = Array.from({ length: LIVES }, (_, i) => `<span class="${i < h.lives ? '' : 'off'}">🚀</span>`).join('');
  $('#hud-bar').style.width = `${(h.correct / h.goal) * 100}%`;
  $('#hud-count').textContent = `${h.correct} / ${h.goal}`;
  $('#hud-hints').textContent = h.hints;
  $('#btn-hint').disabled = !h.canHint;
  $('#hud-expr').innerHTML = exprHtml(h);
  if (modalKind === 'ask') $('#q-expr').innerHTML = exprHtml(h, true);
}

function exprHtml(h, withAnswer = false) {
  const slot = (v) => (v == null ? '<span class="slot">?</span>' : h.showNums ? `<span class="slot shown">${v}</span>` : '<span class="slot filled">?</span>');
  return `${slot(h.a)}<span>${h.symbol}</span>${slot(h.b)}${withAnswer ? '<span>=</span><span class="slot">?</span>' : ''}`;
}

$('#btn-hint').onclick = () => {
  if (game.useHint()) sfx.magic();
};

// ---------- 모달 ----------
let modalKind = null;
function openModal(html, kind = 'misc') {
  modalKind = kind;
  $('#modal-card').innerHTML = html;
  $('#modal').classList.add('open');
  controls.release();
}
function closeModal() {
  modalKind = null;
  $('#modal').classList.remove('open');
}

function showChoice({ stage, a, b }) {
  const { options } = makeChoices(stage, a, b);
  openModal(`
    <p>버그 숫자를 기억해서 정답을 골라요!</p>
    <div class="q-expr" id="q-expr"></div>
    <div class="choices">${options.map((o, i) => `<button class="choice${stage.remainder ? ' rem' : ''}" data-i="${i}">${remLabel(o.label)}</button>`).join('')}</div>
    <div class="modal-hint"><button class="hint-btn" id="q-hint">💡 힌트 <b>${game.hintsLeft}</b></button></div>`, 'ask');
  $('#q-expr').innerHTML = exprHtml(lastHud, true);
  $('#q-hint').disabled = game.hintsLeft <= 0;
  $('#q-hint').onclick = () => {
    if (game.useHint()) {
      sfx.magic();
      $('#q-hint').innerHTML = `💡 힌트 <b>${game.hintsLeft}</b>`;
      $('#q-hint').disabled = game.hintsLeft <= 0;
    }
  };
  $('#modal-card .choices').onclick = (e) => {
    const btn = e.target.closest('.choice');
    if (!btn) return;
    const opt = options[Number(btn.dataset.i)];
    closeModal();
    if (opt.correct) {
      game.answer(true);
    } else {
      game.answer(false);
      showWrong(stage, a, b, opt.label);
    }
  };
}

const remLabel = (label) => (label.includes('…') ? `몫 ${label.split(' … ')[0]}<br><small>나머지 ${label.split(' … ')[1]}</small>` : label);

function showWrong(stage, a, b) {
  const ans = answerOf(stage, a, b);
  const sym = OPS[stage.op].symbol;
  const ansText = typeof ans === 'number' ? ans : `${ans.q} … ${ans.r}`;
  openModal(`
    <h2>아쉬워요! 😅</h2>
    <p>버그 숫자는 <b>${a}</b>와(과) <b>${b}</b>였어요</p>
    <div class="q-expr"><span>${a}</span><span>${sym}</span><span>${b}</span><span>=</span><span class="slot shown">${ansText}</span></div>
    ${pictureable(stage, a, b) ? pictureHtml(stage, a, b) : ''}
    <p>이 문제는 조금 뒤에 다시 나와요!</p>
    <div class="modal-actions"><button class="big-btn" id="w-next">다음 문제 ▶</button></div>`, 'wrong');
  speak(`${a} ${{ add: '더하기', sub: '빼기', mul: '곱하기', div: '나누기' }[stage.op]} ${b}는 ${typeof ans === 'number' ? ans : `몫 ${ans.q} 나머지 ${ans.r}`}`);
  $('#w-next').onclick = () => {
    closeModal();
    game.continueAfterWrong();
  };
}

function pictureHtml(stage, a, b) {
  const A = '🍎';
  const rep = (n) => A.repeat(n);
  switch (stage.op) {
    case 'add':
      return `<div class="picture"><span class="grp">${rep(a)}</span><span class="op">+</span><span class="grp">${rep(b)}</span><small>사과를 모두 세어 보면 ${a + b}개!</small></div>`;
    case 'sub':
      return `<div class="picture"><span class="grp">${rep(a - b)}<span class="gone">${rep(b)}</span></span><small>${a}개에서 ${b}개를 빼면 ${a - b}개가 남아요</small></div>`;
    case 'mul':
      return `<div class="picture">${Array.from({ length: b }, () => `<span class="grp">${rep(a)}</span>`).join('')}<small>${a}개씩 ${b}묶음 = ${a * b}개</small></div>`;
    default:
      return `<div class="picture">${Array.from({ length: a / b }, () => `<span class="grp">${rep(b)}</span>`).join('')}<small>${a}개를 ${b}개씩 묶으면 ${a / b}묶음</small></div>`;
  }
}

function showRevive() {
  openModal(`
    <h2>다시 도전! 💪</h2>
    <p>비행기를 모두 잃었어요.</p>
    <p>모은 정답 <b>${game.correct}개</b>는 그대로예요!</p>
    <p style="opacity:.7">대신 이 단계의 별이 1개 줄어요</p>
    <div class="modal-actions"><button class="big-btn" id="rv-go">다시 도전 🚀</button></div>`, 'revive');
  $('#rv-go').onclick = () => {
    closeModal();
    game.revive();
  };
}

function showClear(res) {
  const key = stageKey(current.op, current.level);
  const before = totalStars(profile);
  profile.stars[key] = Math.max(profile.stars[key] || 0, res.stars);
  const after = totalStars(profile);
  persist();
  const newShips = SHIPS.filter((s) => s.need > before && s.need <= after);
  const hasNext = current.level < stageCount(current.op);
  const o = OPS[current.op];
  openModal(`
    <h2>🎉 ${o.name} ${current.level}단계 클리어!</h2>
    <div class="stars-big">${[1, 2, 3].map((i) => `<span class="${i <= res.stars ? '' : 'off'}">⭐</span>`).join('')}</div>
    <p>정답 ${GOAL}개 · 틀린 문제 ${res.wrong}개 · 힌트 ${res.hintsUsed}번${res.retries ? ` · 다시 도전 ${res.retries}번` : ''}</p>
    ${newShips.map((s) => `<p>🚀 새 비행기 <b>${s.name}</b>이(가) 열렸어요! 격납고에서 골라 보세요</p>`).join('')}
    <div class="modal-actions">
      <button class="big-btn alt" id="c-list">단계 선택</button>
      ${hasNext ? '<button class="big-btn" id="c-next">다음 단계 ▶</button>' : ''}
    </div>`, 'clear');
  $('#c-list').onclick = () => show('stages');
  if (hasNext) $('#c-next').onclick = () => startStage(current.op, current.level + 1);
}

// ---------- 일시정지 ----------
$('#btn-pause').onclick = () => {
  if (game.frozen || game.state === 'clear') return;
  sfx.tap();
  game.paused = true;
  openModal(`
    <h2>잠깐 쉬어요 ⏸</h2>
    <div class="modal-actions" style="flex-direction:column;align-items:center">
      <button class="big-btn" id="p-go">계속하기 ▶</button>
      <button class="big-btn alt" id="p-layout">🎮 버튼 위치 바꾸기</button>
      <button class="big-btn alt" id="p-quit">그만하기</button>
    </div>
    <p style="opacity:.7;margin-top:12px">그만하면 이번 단계에서 모은 정답은 저장되지 않아요</p>`, 'pause');
  $('#p-go').onclick = () => { closeModal(); game.paused = false; };
  $('#p-layout').onclick = () => { closeModal(); controls.setEditing(true); editFrom = 'pause'; };
  $('#p-quit').onclick = () => show('stages');
};

// ---------- 버튼 위치 바꾸기 ----------
let editFrom = null;
function openLayoutEditor() {
  editFrom = 'settings';
  show('game');
  game.hideShip = false;
  game.resize();
  game.idle();
  controls.apply();
  controls.setEditing(true);
}
$('#edit-swap').onclick = () => controls.swapSides();
$('#edit-smaller').onclick = () => controls.resize(-0.1);
$('#edit-bigger').onclick = () => controls.resize(0.1);
$('#edit-reset').onclick = () => {
  profile.layout = defaultLayout();
  persist();
  controls.apply();
};
$('#edit-done').onclick = () => {
  controls.setEditing(false);
  if (editFrom === 'pause') game.paused = false;
  else show('settings');
  editFrom = null;
};

// ---------- 격납고 ----------
function renderHangar() {
  const total = totalStars(profile);
  $('#hangar-stars').textContent = total;
  const list = $('#ship-list');
  list.innerHTML = '';
  for (const s of SHIPS) {
    const open = total >= s.need;
    const b = document.createElement('button');
    b.className = `ship${profile.ship === s.id ? ' on' : ''}${open ? '' : ' locked'}`;
    b.innerHTML = `<canvas width="240" height="240"></canvas>${s.name}<small>${open ? (profile.ship === s.id ? '타고 있어요 ✔' : '눌러서 타기') : `⭐ ${s.need}개 필요`}</small>`;
    const ctx = b.querySelector('canvas').getContext('2d');
    drawShip(ctx, s, 120, 125, 62, 0.2);
    if (open) b.onclick = () => {
      sfx.tap();
      profile.ship = s.id;
      persist();
      applyProfile();
      renderHangar();
    };
    list.appendChild(b);
  }
}

// ---------- 설정 ----------
function renderSettings() {
  $('#set-sound').checked = profile.sound;
  $('#set-voice').checked = profile.voice;
}
$('#set-sound').onchange = (e) => { profile.sound = e.target.checked; persist(); applyProfile(); sfx.tap(); };
$('#set-voice').onchange = (e) => { profile.voice = e.target.checked; persist(); applyProfile(); if (profile.voice) speak('안녕!'); };
$('#set-layout').onclick = () => { sfx.tap(); openLayoutEditor(); };
$('#set-swap').onclick = () => {
  controls.swapSides();
  const leftHanded = profile.layout.fire.x < 0.5;
  openModal(`<h2>바꿨어요! ↔</h2><p>지금은 <b>${leftHanded ? '왼손잡이' : '오른손잡이'}</b> 배치예요</p><p>${leftHanded ? '발사 버튼이 왼쪽, 방향키가 오른쪽' : '방향키가 왼쪽, 발사 버튼이 오른쪽'}</p><div class="modal-actions"><button class="big-btn" id="sw-ok">좋아요</button></div>`);
  $('#sw-ok').onclick = closeModal;
};
$('#set-delete').onclick = () => {
  openModal(`<h2>정말 지울까요?</h2><p>${profile.avatar} ${esc(profile.name)}의 별과 진도가 모두 사라져요</p>
    <div class="modal-actions"><button class="big-btn alt" id="d-no">아니요</button><button class="big-btn" id="d-yes">지우기</button></div>`);
  $('#d-no').onclick = closeModal;
  $('#d-yes').onclick = () => {
    data.profiles = data.profiles.filter((p) => p.id !== profile.id);
    data.currentId = null;
    profile = null;
    persist();
    show('profile');
  };
};

// ---------- 키보드 (PC 테스트용) ----------
const keys = new Set();
const keyDir = () => {
  if (controls.padActive) return;
  game.input.dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  game.input.dy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
};
window.addEventListener('keydown', (e) => {
  if (!gameScreen.classList.contains('active') || $('#modal').classList.contains('open')) return;
  if (e.key.startsWith('Arrow')) {
    keys.add(e.key);
    keyDir();
    e.preventDefault();
  } else if (e.key === ' ') {
    game.input.fireHeld = true;
    game.fire();
    e.preventDefault();
  } else if (e.key === 'h' || e.key === 'H') {
    $('#btn-hint').click();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key.startsWith('Arrow')) {
    keys.delete(e.key);
    keyDir();
  } else if (e.key === ' ') game.input.fireHeld = false;
});

// 첫 터치에서 소리 켜기 (브라우저 정책)
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// 홈 화면에 설치된 앱(PWA)은 오프라인에서도 열리게
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- 시작 ----------
if (profile) {
  applyProfile();
  show('home');
} else show('profile');
