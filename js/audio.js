// 효과음(WebAudio 합성 — 파일 없음)과 숫자 읽어 주기(음성 합성)
let ctx = null;
let master = null;
export const audioPrefs = { sound: true, voice: true };

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.5, slide = 0, delay = 0 } = {}) {
  if (!audioPrefs.sound || !ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  shoot: () => tone(880, 0.08, { type: 'square', vol: 0.12, slide: 400 }),
  clink: () => { tone(1500, 0.06, { type: 'triangle', vol: 0.25 }); tone(2100, 0.08, { type: 'triangle', vol: 0.15, delay: 0.03 }); },
  pop: () => { tone(520, 0.12, { type: 'triangle', vol: 0.4, slide: 500 }); tone(1040, 0.1, { vol: 0.2, delay: 0.05 }); },
  bossHit: () => tone(260, 0.12, { type: 'square', vol: 0.2, slide: -80 }),
  magic: () => [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, { vol: 0.18, delay: i * 0.05 })),
  hurt: () => tone(330, 0.35, { type: 'sawtooth', vol: 0.2, slide: -220 }),
  correct: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.35, delay: i * 0.08 })),
  wrong: () => { tone(392, 0.18, { type: 'triangle', vol: 0.3 }); tone(330, 0.3, { type: 'triangle', vol: 0.3, delay: 0.16 }); },
  tap: () => tone(700, 0.05, { type: 'triangle', vol: 0.2 }),
  levelup: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.35, delay: i * 0.11 })),
  boss: () => [196, 233, 262].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.15, delay: i * 0.14 })),
};

let koVoice = null;
function findVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  koVoice = vs.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) || null;
}
if ('speechSynthesis' in window) {
  findVoice();
  speechSynthesis.onvoiceschanged = findVoice;
}

export function speak(text) {
  if (!audioPrefs.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'ko-KR';
    if (koVoice) u.voice = koVoice;
    u.rate = 1.05;
    u.pitch = 1.25;
    speechSynthesis.speak(u);
  } catch {
    /* 음성 합성이 없는 기기 */
  }
}
