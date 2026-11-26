const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../sudoku/sudoku.js');

// ---- Task 1: 판 기본 로직 ----

test('peers', () => {
  const p = S.peers(0);
  assert.equal(p.length, 20);
  assert.ok(p.includes(1) && p.includes(9) && p.includes(10) && p.includes(72));
  assert.ok(!p.includes(0) && !p.includes(80) && !p.includes(13));
});

test('units', () => {
  assert.equal(S.units.length, 27);
  const count = Array(81).fill(0);
  for (const u of S.units) {
    assert.equal(u.cells.length, 9);
    for (const i of u.cells) count[i]++;
  }
  assert.ok(count.every((x) => x === 3));
  assert.deepEqual(S.units[0], { type: 'row', index: 0, cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] });
  assert.deepEqual(S.units[9].cells, [0, 9, 18, 27, 36, 45, 54, 63, 72]);
  assert.deepEqual(S.units[18].cells, [0, 1, 2, 9, 10, 11, 18, 19, 20]);
});

test('randomFull is valid', () => {
  const seen = new Set();
  for (let k = 0; k < 20; k++) {
    const g = S.randomFull();
    assert.ok(S.isValidFull(g));
    seen.add(g.join(''));
  }
  assert.equal(seen.size, 20);
});

test('isValidFull rejects duplicates and blanks', () => {
  const g = S.randomFull();
  const blank = g.slice(); blank[5] = 0;
  assert.equal(S.isValidFull(blank), false);
  const dup = g.slice(); [dup[0], dup[1]] = [dup[1], dup[0]];
  assert.equal(S.isValidFull(dup), false);
});

test('countSolutions', () => {
  const full = S.randomFull();
  const one = full.slice(); one[40] = 0;
  assert.equal(S.countSolutions(one), 1);
  assert.equal(S.countSolutions(Array(81).fill(0)), 2);
  const bad = Array(81).fill(0); bad[0] = 5; bad[1] = 5;
  assert.equal(S.countSolutions(bad), 0);
  assert.deepEqual(S.solve(one), full);
});

test('candidates', () => {
  const full = S.randomFull();
  const g = full.slice(); g[0] = 0;
  assert.equal(S.candidates(g)[0], 1 << full[0]);
  assert.equal(S.candidates(g)[1], 0, '숫자 있는 칸은 0');
  const elim = Array(81).fill(0); elim[0] = 1 << full[0];
  assert.equal(S.candidates(g, elim)[0], 0);
});

// ---- Task 2: 기법 엔진 ----
const ALLM = 0b1111111110;
const maskOf = (...ds) => ds.reduce((m, d) => m | (1 << d), 0);
const blank = () => Array(81).fill(0);
const allMasks = () => Array(81).fill(ALLM);
const elimKeys = (step) => (step.eliminate || []).map((e) => e.cell * 10 + e.digit).sort((a, b) => a - b);
const keys = (pairs) => pairs.map(([c, d]) => c * 10 + d).sort((a, b) => a - b);

test('hidden-single', () => {
  const m = allMasks();
  for (let c = 0; c < 9; c++) if (c !== 3) m[c] &= ~(1 << 5);
  const s = S.findStep(blank(), m);
  assert.equal(s.tech, 'hidden-single');
  assert.equal(s.level, 1);
  assert.deepEqual(s.place, { cell: 3, digit: 5 });
});

test('naked-single', () => {
  const m = allMasks();
  m[40] = maskOf(7);
  const s = S.findStep(blank(), m);
  assert.equal(s.tech, 'naked-single');
  assert.deepEqual(s.place, { cell: 40, digit: 7 });
});

test('pointing', () => {
  const m = allMasks();
  for (const i of [2, 9, 10, 11, 18, 19, 20]) m[i] &= ~(1 << 3);
  const s = S.findStep(blank(), m);
  assert.equal(s.tech, 'pointing');
  assert.equal(s.level, 2);
  assert.deepEqual(elimKeys(s), keys([3, 4, 5, 6, 7, 8].map((c) => [c, 3])));
});

test('naked-pair', () => {
  const m = allMasks();
  m[0] = m[1] = maskOf(1, 2);
  const s = S.findStep(blank(), m);
  assert.equal(s.tech, 'naked-pair');
  assert.deepEqual(s.unit, { type: 'row', index: 0 });
  assert.deepEqual(elimKeys(s), keys([2, 3, 4, 5, 6, 7, 8].flatMap((c) => [[c, 1], [c, 2]])));
});

test('x-wing', () => {
  const m = allMasks();
  for (const r of [1, 5]) for (let c = 0; c < 9; c++) if (c !== 2 && c !== 7) m[r * 9 + c] &= ~(1 << 4);
  const s = S.findStep(blank(), m);
  assert.equal(s.tech, 'x-wing');
  assert.equal(s.level, 3);
  const want = [];
  for (let r = 0; r < 9; r++) if (r !== 1 && r !== 5) for (const c of [2, 7]) want.push([r * 9 + c, 4]);
  assert.deepEqual(elimKeys(s), keys(want));
});

test('xy-wing', () => {
  const m = allMasks();
  m[0] = maskOf(1, 2);  // 축 r0c0
  m[5] = maskOf(1, 3);  // 날개 r0c5 (같은 행)
  m[45] = maskOf(2, 3); // 날개 r5c0 (같은 열)
  const s = S.findStep(blank(), m);
  assert.equal(s.tech, 'xy-wing');
  assert.deepEqual(elimKeys(s), keys([[50, 3]]));
});

test('grade: one blank is level 1', () => {
  const g = S.randomFull();
  g[30] = 0;
  assert.equal(S.grade(g).level, 1);
});

test('grade steps are sound', () => {
  let graded = 0;
  for (let k = 0; k < 20; k++) {
    const sol = S.randomFull();
    const g = sol.slice();
    for (const i of [...Array(81).keys()].sort(() => Math.random() - 0.5).slice(0, 50)) {
      const v = g[i]; g[i] = 0;
      if (S.countSolutions(g) !== 1) g[i] = v;
    }
    const res = S.grade(g);
    if (res.level) graded++;
    for (const st of res.steps) {
      if (st.place) assert.equal(st.place.digit, sol[st.place.cell], `${st.tech} place`);
      for (const e of st.eliminate || []) assert.notEqual(e.digit, sol[e.cell], `${st.tech}가 정답 숫자를 지움`);
    }
  }
  assert.ok(graded >= 15, `기법으로 풀린 판 ${graded}/20`);
});

// ---- Task 3: 난이도별 생성기 ----
test('generate levels', () => {
  for (const level of [1, 2, 3])
    for (let k = 0; k < 10; k++) {
      const { puzzle, solution, level: lv } = S.generate(level);
      assert.equal(lv, level);
      assert.equal(S.countSolutions(puzzle), 1, `level ${level} 정답이 하나가 아님`);
      assert.ok(S.isValidFull(solution));
      assert.deepEqual(S.solve(puzzle), solution);
      puzzle.forEach((v, i) => { if (v) assert.equal(v, solution[i]); });
      assert.equal(S.grade(puzzle).level, level, `level ${level} 등급 불일치`);
    }
});

test('easy clue count', () => {
  for (let k = 0; k < 10; k++) {
    const clues = S.generate(1).puzzle.filter((v) => v).length;
    assert.ok(clues >= 36 && clues <= 45, `쉬움 주어진 숫자 ${clues}`);
  }
});

test('timing', () => {
  for (const level of [1, 2, 3]) {
    const times = [];
    for (let k = 0; k < 20; k++) {
      const t = performance.now();
      S.generate(level);
      times.push(performance.now() - t);
    }
    const avg = times.reduce((a, b) => a + b) / times.length, max = Math.max(...times);
    console.log(`  level ${level}: 평균 ${avg.toFixed(0)}ms 최악 ${max.toFixed(0)}ms`);
    assert.ok(avg < 300, `level ${level} 평균 ${avg.toFixed(0)}ms`);
    assert.ok(max < 1000, `level ${level} 최악 ${max.toFixed(0)}ms`);
  }
});
