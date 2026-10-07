// 연산별 10단계 정의 (docs/기획안.md 7장 단계표)
// rule(a, b): a를 먼저 맞히고 b를 나중에 맞혔을 때 이 단계 문제로 인정되는지
// sym: 덧셈·곱셈처럼 순서가 상관없는 연산

export const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ones = (n) => n % 10;
const tens = (n) => Math.floor(n / 10) % 10;
const isOne = (n) => n >= 1 && n <= 9;
const isTwo = (n) => n >= 10 && n <= 99;
const isThree = (n) => n >= 100 && n <= 999;
const isTens = (n) => n >= 10 && n <= 90 && n % 10 === 0;

export const OPS = {
  add: { key: 'add', symbol: '+', name: '덧셈', color: '#FFB3D1', deep: '#E8609A' },
  sub: { key: 'sub', symbol: '−', name: '뺄셈', color: '#A9DCFF', deep: '#3D97D6' },
  mul: { key: 'mul', symbol: '×', name: '곱셈', color: '#FFE08A', deep: '#D99A12' },
  div: { key: 'div', symbol: '÷', name: '나눗셈', color: '#B9EDB3', deep: '#46A93E' },
};
export const OP_ORDER = ['add', 'sub', 'mul', 'div'];
export const GOAL = 20;
export const HINTS_PER_STAGE = 5;
export const LIVES = 3;

const timesTable = (set) => ({
  dA: () => pick(set),
  dB: () => ri(1, 9),
  rule: (a, b) => set.includes(a) && isOne(b),
  sym: true,
});

const divTable = (set) => ({
  gen: () => {
    const b = pick(set);
    return [b * ri(1, 9), b];
  },
  rule: (a, b) => set.includes(b) && a % b === 0 && a / b >= 1 && a / b <= 9,
});

const STAGES = {
  add: [
    { title: '1~5 + 1~5', ex: '2 + 4', dA: () => ri(1, 5), dB: () => ri(1, 5),
      rule: (a, b) => a >= 1 && a <= 5 && b >= 1 && b <= 5, sym: true },
    { title: '합이 10 이하', ex: '3 + 6', dA: () => ri(1, 9), dB: () => ri(1, 9),
      rule: (a, b) => isOne(a) && isOne(b) && a + b <= 10, sym: true },
    { title: '한 자리 + 한 자리 (받아올림)', ex: '7 + 8', dA: () => ri(2, 9), dB: () => ri(2, 9),
      rule: (a, b) => isOne(a) && isOne(b) && a + b >= 11, sym: true },
    { title: '두 자리 + 한 자리', ex: '23 + 4', dA: () => ri(10, 89), dB: () => ri(1, 9),
      rule: (a, b) => isTwo(a) && isOne(b) && ones(a) + b <= 9, sym: true },
    { title: '두 자리 + 한 자리 (받아올림)', ex: '27 + 6', dA: () => ri(11, 89), dB: () => ri(2, 9),
      rule: (a, b) => isTwo(a) && isOne(b) && ones(a) + b >= 10 && a + b <= 99, sym: true },
    { title: '몇십 + 몇십', ex: '30 + 40', dA: () => ri(1, 8) * 10, dB: () => ri(1, 8) * 10,
      rule: (a, b) => isTens(a) && isTens(b) && a + b <= 90, sym: true },
    { title: '두 자리 + 두 자리', ex: '34 + 25', dA: () => ri(10, 79), dB: () => ri(10, 79),
      rule: (a, b) => isTwo(a) && isTwo(b) && ones(a) + ones(b) <= 9 && a + b <= 99, sym: true },
    { title: '두 자리 + 두 자리 (받아올림)', ex: '38 + 27', dA: () => ri(11, 79), dB: () => ri(11, 79),
      rule: (a, b) => isTwo(a) && isTwo(b) && ones(a) + ones(b) >= 10 && a + b <= 99, sym: true },
    { title: '합이 100 넘음', ex: '78 + 56', dA: () => ri(40, 99), dB: () => ri(40, 99),
      rule: (a, b) => isTwo(a) && isTwo(b) && a + b > 100, sym: true },
    { title: '세 자리 + 세 자리', ex: '345 + 278', dA: () => ri(100, 599), dB: () => ri(100, 399),
      rule: (a, b) => isThree(a) && isThree(b) && a + b <= 999, sym: true },
  ],
  sub: [
    { title: '5 이하 빼기', ex: '5 − 2', dA: () => ri(1, 5), dB: () => ri(1, 5),
      rule: (a, b) => a <= 5 && b >= 1 && a >= b },
    { title: '10 이하 빼기', ex: '9 − 4', dA: () => ri(1, 10), dB: () => ri(1, 10),
      rule: (a, b) => a <= 10 && b >= 1 && a >= b },
    { title: '십몇 − 한 자리', ex: '13 − 5', dA: () => ri(11, 18), dB: () => ri(2, 9),
      rule: (a, b) => a >= 11 && a <= 18 && isOne(b) && ones(a) < b },
    { title: '두 자리 − 한 자리', ex: '38 − 5', dA: () => ri(10, 99), dB: () => ri(1, 9),
      rule: (a, b) => isTwo(a) && isOne(b) && ones(a) >= b },
    { title: '두 자리 − 한 자리 (받아내림)', ex: '42 − 7', dA: () => ri(20, 99), dB: () => ri(2, 9),
      rule: (a, b) => a >= 20 && a <= 99 && isOne(b) && ones(a) < b },
    { title: '몇십 − 몇십', ex: '70 − 30', dA: () => ri(2, 9) * 10, dB: () => ri(1, 8) * 10,
      rule: (a, b) => isTens(a) && isTens(b) && a > b },
    { title: '두 자리 − 두 자리', ex: '58 − 23', dA: () => ri(20, 99), dB: () => ri(10, 89),
      rule: (a, b) => isTwo(a) && isTwo(b) && a > b && ones(a) >= ones(b) },
    { title: '두 자리 − 두 자리 (받아내림)', ex: '52 − 28', dA: () => ri(30, 99), dB: () => ri(11, 89),
      rule: (a, b) => isTwo(a) && isTwo(b) && ones(a) < ones(b) && tens(a) > tens(b) },
    { title: '100 − 두 자리', ex: '100 − 37', dA: () => 100, dB: () => ri(10, 99),
      rule: (a, b) => a === 100 && isTwo(b) },
    { title: '세 자리 − 세 자리', ex: '523 − 186', dA: () => ri(300, 999), dB: () => ri(100, 699),
      rule: (a, b) => isThree(a) && isThree(b) && a > b },
  ],
  mul: [
    { title: '2단, 5단', ex: '5 × 3', ...timesTable([2, 5]) },
    { title: '3단, 6단', ex: '6 × 4', ...timesTable([3, 6]) },
    { title: '4단, 8단', ex: '8 × 7', ...timesTable([4, 8]) },
    { title: '7단, 9단', ex: '9 × 6', ...timesTable([7, 9]) },
    { title: '2~9단 섞기', ex: '7 × 8', dA: () => ri(2, 9), dB: () => ri(2, 9),
      rule: (a, b) => a >= 2 && a <= 9 && b >= 2 && b <= 9, sym: true },
    { title: '몇십 × 몇', ex: '20 × 3', dA: () => ri(1, 9) * 10, dB: () => ri(2, 9),
      rule: (a, b) => isTens(a) && b >= 2 && b <= 9, sym: true },
    { title: '두 자리 × 한 자리', ex: '12 × 3', dA: () => ri(11, 44), dB: () => ri(2, 4),
      rule: (a, b) => isTwo(a) && a % 10 !== 0 && b >= 2 && b <= 9 && ones(a) * b <= 9 && tens(a) * b <= 9, sym: true },
    { title: '두 자리 × 한 자리 (올림)', ex: '27 × 4', dA: () => ri(12, 49), dB: () => ri(2, 9),
      rule: (a, b) => a >= 12 && a <= 49 && b >= 2 && b <= 9 && ones(a) * b >= 10, sym: true },
    { title: '세 자리 × 한 자리', ex: '213 × 3', dA: () => ri(101, 399), dB: () => ri(2, 5),
      rule: (a, b) => a >= 100 && a <= 399 && b >= 2 && b <= 5, sym: true },
    { title: '두 자리 × 두 자리', ex: '23 × 14', dA: () => ri(11, 49), dB: () => ri(11, 29),
      rule: (a, b) => a >= 11 && a <= 49 && b >= 11 && b <= 29, sym: true },
  ],
  div: [
    { title: '÷2, ÷5', ex: '10 ÷ 2', ...divTable([2, 5]) },
    { title: '÷3, ÷6', ex: '18 ÷ 6', ...divTable([3, 6]) },
    { title: '÷4, ÷8', ex: '32 ÷ 4', ...divTable([4, 8]) },
    { title: '÷7, ÷9', ex: '63 ÷ 9', ...divTable([7, 9]) },
    { title: '섞기', ex: '42 ÷ 6', ...divTable([2, 3, 4, 5, 6, 7, 8, 9]) },
    { title: '몇십 ÷ 몇', ex: '60 ÷ 3',
      gen: () => {
        const b = ri(2, 9);
        return [b * ri(1, Math.floor(9 / b)) * 10, b];
      },
      rule: (a, b) => isTens(a) && b >= 2 && b <= 9 && (a / 10) % b === 0 },
    { title: '두 자리 ÷ 한 자리', ex: '48 ÷ 4',
      gen: () => {
        const b = ri(2, 4);
        return [b * ri(1, Math.floor(9 / b)) * 10 + b * ri(0, Math.floor(9 / b)), b];
      },
      rule: (a, b) => isTwo(a) && b >= 2 && b <= 9 && tens(a) % b === 0 && ones(a) % b === 0 },
    { title: '두 자리 ÷ 한 자리 (내림)', ex: '72 ÷ 4',
      gen: () => {
        const b = ri(2, 6);
        return [b * ri(10, Math.floor(99 / b)), b];
      },
      rule: (a, b) => isTwo(a) && b >= 2 && b <= 9 && a % b === 0 && a / b >= 10 && tens(a) % b !== 0 },
    { title: '나머지 있는 나눗셈', ex: '17 ÷ 5', remainder: true,
      gen: () => {
        const b = ri(2, 9);
        return [b * ri(1, 9) + ri(1, b - 1), b];
      },
      rule: (a, b) => b >= 2 && b <= 9 && a > b && a % b !== 0 && Math.floor(a / b) <= 9 },
    { title: '세 자리 ÷ 한 자리', ex: '156 ÷ 3',
      gen: () => {
        const b = ri(2, 9);
        return [b * ri(Math.ceil(100 / b), Math.min(199, Math.floor(999 / b))), b];
      },
      rule: (a, b) => isThree(a) && b >= 2 && b <= 9 && a % b === 0 },
  ],
};

export function getStage(op, level) {
  const s = STAGES[op][level - 1];
  const stage = { op, level, ...s };
  // 생성기가 따로 없으면 도메인에서 뽑아 규칙에 맞을 때까지 다시 뽑는다
  if (!stage.gen) {
    stage.gen = () => {
      for (let i = 0; i < 5000; i++) {
        const a = s.dA();
        const b = s.dB();
        if (s.rule(a, b)) return [a, b];
      }
      throw new Error(`${op}-${level}: 문제 생성 실패`);
    };
  } else {
    // 직접 만든 생성기도 규칙을 반드시 통과하게 한 번 더 거른다
    const raw = stage.gen;
    stage.gen = () => {
      for (let i = 0; i < 5000; i++) {
        const p = raw();
        if (s.rule(p[0], p[1])) return p;
      }
      throw new Error(`${op}-${level}: 문제 생성 실패`);
    };
  }
  stage.valid = (a, b) => (s.sym ? s.rule(a, b) || s.rule(b, a) : s.rule(a, b));
  stage.filler = () => (Math.random() < 0.5 ? (s.dA ? s.dA() : stage.gen()[0]) : (s.dB ? s.dB() : stage.gen()[1]));
  // 숫자가 보이는 시간: 1단계 1.6초 → 10단계 0.9초
  stage.memSec = 1.6 - (level - 1) * (0.7 / 9);
  return stage;
}

export const stageCount = (op) => STAGES[op].length;
export const stageInfo = (op, level) => STAGES[op][level - 1];

export function answerOf(stage, a, b) {
  switch (stage.op) {
    case 'add': return a + b;
    case 'sub': return a - b;
    case 'mul': return a * b;
    default:
      return stage.remainder ? { q: Math.floor(a / b), r: a % b } : a / b;
  }
}

export const answerLabel = (ans) => (typeof ans === 'number' ? String(ans) : `${ans.q} … ${ans.r}`);
