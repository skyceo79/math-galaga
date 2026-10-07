// 버그 편대 구성, 회색 철갑 판정, 4지선다 오답 보기
import { answerOf, answerLabel, pick } from './levels.js';

export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// forced: 복습 문제처럼 정해진 (a, b)만 정답 쌍으로 인정할 때
export function pairOk(stage, a, b, forced) {
  if (forced) return (a === forced.a && b === forced.b) || (!!stage.sym && a === forced.b && b === forced.a);
  return stage.valid(a, b);
}

/**
 * 한 문제(웨이브)에 쓸 버그 숫자를 만든다.
 * 반환: { nums, boss } — boss가 있으면 그 숫자가 첫 번째 수
 */
export function buildWave(stage, { forced = null, boss = false } = {}) {
  const isDiv = stage.op === 'div';
  if (boss) {
    const [a, b] = forced ? [forced.a, forced.b] : stage.gen();
    let escorts;
    if (isDiv) escorts = divisorNums(stage, a, 5, forced);
    else {
      escorts = [b, b];
      while (escorts.length < 5) escorts.push(stage.filler());
      shuffle(escorts);
    }
    return { boss: a, nums: escorts, bossPair: { a, b } };
  }
  if (isDiv) {
    const nums = [];
    if (forced) nums.push(forced.a, forced.a);
    while (nums.length < 8) nums.push(stage.gen()[0]);
    return { nums: shuffle(nums) };
  }
  const nums = [];
  if (forced) nums.push(forced.a, forced.b);
  else for (let i = 0; i < 4; i++) nums.push(...stage.gen());
  while (nums.length < 10) nums.push(stage.filler());
  return { nums: shuffle(nums) };
}

// 나눗셈: 나뉠 수 a를 맞힌 뒤 남은 버그들이 바뀔 '나누는 수'
export function divisorNums(stage, a, count, forced) {
  const all = [2, 3, 4, 5, 6, 7, 8, 9];
  const good = forced ? [forced.b] : all.filter((b) => stage.rule(a, b));
  const bad = shuffle(all.filter((b) => !good.includes(b)));
  const nGood = Math.min(count, count >= 4 ? 2 : 1);
  const out = [];
  for (let i = 0; i < nGood; i++) out.push(pick(good));
  while (out.length < count) out.push(bad.length ? bad.pop() : pick(good));
  return shuffle(out);
}

// ---------- 4지선다 ----------

const digits = (n) => String(n).split('').map(Number);
const fromDigits = (d) => Number(d.join(''));

// 받아올림을 빠뜨린 덧셈 (27 + 6 → 23)
function addNoCarry(a, b) {
  const da = digits(a).reverse();
  const db = digits(b).reverse();
  const out = [];
  for (let i = 0; i < Math.max(da.length, db.length); i++) out.push(((da[i] || 0) + (db[i] || 0)) % 10);
  return fromDigits(out.reverse());
}

// 자리마다 큰 수에서 작은 수를 뺀 실수 (42 − 7 → 45)
function subAbsDigits(a, b) {
  const da = digits(a).reverse();
  const db = digits(b).reverse();
  const out = da.map((d, i) => Math.abs(d - (db[i] || 0)));
  return fromDigits(out.reverse());
}

function numberCandidates(stage, a, b, c) {
  const near = [c + 1, c - 1];
  switch (stage.op) {
    case 'add':
      return [[...near, addNoCarry(a, b), c >= 10 ? c + 10 : c + 2, ...(a <= 9 && b <= 9 ? [a * b] : [])], [c + 2, c - 2, c - 10, c + 10]];
    case 'sub':
      return [[...near, subAbsDigits(a, b), c >= 10 ? c + 10 : c + 2, ...(a <= 20 ? [a + b] : [])], [c + 2, c - 2, c - 10]];
    case 'mul': {
      const s = Math.min(a, b);
      const l = Math.max(a, b);
      return [[c + s, c - s, c + l, c - l, ...near], [a + b, c + 10, c - 10, c + 2]];
    }
    default:
      return [[...near, c + 2, c - 2], [a - b, b, c + 10, c - 10, c * 2]];
  }
}

function remainderCandidates(a, b, { q, r }) {
  return [
    [{ q: q + 1, r }, { q: q - 1, r }, { q, r: r + 1 }, { q, r: r - 1 }, { q: q - 1, r: r + b }],
    [{ q: q + 1, r: 0 }, { q: q + 2, r }, { q, r: r + 2 }],
  ];
}

/** 정답 + 오답 3개를 섞어서 돌려준다. { correct, options: [{label, correct}] } */
export function makeChoices(stage, a, b) {
  const ans = answerOf(stage, a, b);
  const correct = answerLabel(ans);
  const [primary, secondary] = typeof ans === 'number'
    ? numberCandidates(stage, a, b, ans)
    : remainderCandidates(a, b, ans);
  const ok = (x) => (typeof x === 'number' ? Number.isInteger(x) && x >= 0 : x.q >= 0 && x.r >= 0);
  const labels = new Set([correct]);
  const picked = [];
  const take = (list, n) => {
    for (const x of shuffle(list.filter(ok))) {
      if (picked.length >= n) break;
      const l = answerLabel(x);
      if (!labels.has(l)) {
        labels.add(l);
        picked.push(l);
      }
    }
  };
  take(primary, 2);
  take([...primary, ...secondary], 3);
  // 그래도 부족하면 가까운 수로 채운다
  for (let k = 3; picked.length < 3; k++) {
    const x = typeof ans === 'number' ? ans + k : { q: ans.q + k, r: ans.r };
    const l = answerLabel(x);
    if (!labels.has(l)) {
      labels.add(l);
      picked.push(l);
    }
  }
  const options = shuffle([{ label: correct, correct: true }, ...picked.map((label) => ({ label, correct: false }))]);
  return { correct, options };
}

// 그림 힌트를 보여 줄 만큼 숫자가 작은지
export function pictureable(stage, a, b) {
  switch (stage.op) {
    case 'add': return a <= 10 && b <= 10;
    case 'sub': return a <= 12;
    case 'mul': return a <= 9 && b <= 9 && a * b <= 30;
    default: return !stage.remainder && a <= 30 && b <= 9;
  }
}
