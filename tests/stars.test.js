const test = require('node:test');
const assert = require('node:assert/strict');
const Stars = require('../star-battle/stars.js');

const marksOf = (n, cols) => {
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  cols.forEach((c, r) => (m[r][c] = 2));
  return m;
};

function assertConnected(regions, id) {
  const n = regions.length, cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (regions[r][c] === id) cells.push([r, c]);
  assert.ok(cells.length > 0, `영역 ${id} 없음`);
  const seen = new Set([cells[0].join()]), q = [cells[0]];
  while (q.length) {
    const [r, c] = q.pop();
    for (const [a, b] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]])
      if (a >= 0 && a < n && b >= 0 && b < n && regions[a][b] === id && !seen.has(a + ',' + b)) {
        seen.add(a + ',' + b); q.push([a, b]);
      }
  }
  assert.equal(seen.size, cells.length, `영역 ${id}가 끊어짐`);
}

test('generate is valid and unique', () => {
  for (let n = 5; n <= 9; n++)
    for (let k = 0; k < 10; k++) {
      const { regions, solution } = Stars.generate(n);
      assert.equal(regions.length, n);
      for (const row of regions) {
        assert.equal(row.length, n);
        for (const v of row) assert.ok(Number.isInteger(v) && v >= 0 && v < n);
      }
      for (let id = 0; id < n; id++) assertConnected(regions, id);
      assert.ok(Stars.isSolved(regions, marksOf(n, solution)), `n=${n} 정답이 규칙에 안 맞음`);
      assert.deepEqual(Stars.solve(regions, 2), [solution], `n=${n} 정답이 하나가 아님`);
    }
});

test('timing', () => {
  const times = [];
  for (let k = 0; k < 20; k++) {
    const t = performance.now();
    Stars.generate(9);
    times.push(performance.now() - t);
  }
  const avg = times.reduce((a, b) => a + b) / times.length;
  assert.ok(avg < 200, `평균 ${avg.toFixed(0)}ms`);
  assert.ok(Math.max(...times) < 1000, `최대 ${Math.max(...times).toFixed(0)}ms`);
});

// 줄 r = 영역 r 인 5×5 판
const ROWS5 = Array.from({ length: 5 }, (_, r) => Array(5).fill(r));
const place = (stars, xs = []) => {
  const m = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const [r, c] of stars) m[r][c] = 2;
  for (const [r, c] of xs) m[r][c] = 1;
  return m;
};

test('conflicts', () => {
  let c = Stars.conflicts(ROWS5, place([[0, 0], [0, 3]]));
  assert.ok(c[0][0] && c[0][3], '같은 줄');
  c = Stars.conflicts(ROWS5, place([[0, 0], [1, 1]]));
  assert.ok(c[0][0] && c[1][1], '대각선 이웃');
  c = Stars.conflicts(ROWS5, place([[0, 0], [3, 0]]));
  assert.ok(c[0][0] && c[3][0], '같은 열');
  c = Stars.conflicts(ROWS5, place([[0, 0], [2, 3]], [[0, 1], [0, 2]]));
  assert.ok(!c[0][0] && !c[2][3], '충돌 없음');
  assert.ok(!c[0][1] && !c[0][2], 'X는 충돌 아님');
});

test('conflicts in same region', () => {
  const regions = ROWS5.map((row) => row.slice());
  regions[2][4] = 0; // (2,4)를 영역 0에 넣는다
  const c = Stars.conflicts(regions, place([[0, 0], [2, 4]]));
  assert.ok(c[0][0] && c[2][4]);
});

test('isSolved', () => {
  const { regions, solution } = Stars.generate(6);
  const m = marksOf(6, solution);
  assert.ok(Stars.isSolved(regions, m));
  const withX = m.map((row) => row.map((v) => (v === 0 ? 1 : v)));
  assert.ok(Stars.isSolved(regions, withX), 'X를 더 놓아도 정답');
  m[0][solution[0]] = 0;
  assert.ok(!Stars.isSolved(regions, m), '별 하나 빠짐');
});

// ---- 힌트: 정답을 보여주지 않고 제외할 칸(과 이유)을 알려준다 ----
const emptyMarks = (n) => Array.from({ length: n }, () => Array(n).fill(0));
const conflict = (regions, [a, b], [c, d]) =>
  a === c || b === d || regions[a][b] === regions[c][d] || (Math.abs(a - c) <= 1 && Math.abs(b - d) <= 1);

test('hint points at a wrong star first', () => {
  const { regions, solution } = Stars.generate(6);
  const m = emptyMarks(6);
  const wrongCol = (solution[2] + 3) % 6;
  m[2][wrongCol] = 2;
  const h = Stars.hint(regions, m, solution);
  assert.equal(h.rule, 'wrong-star');
  assert.deepEqual(h.focus, [[2, wrongCol]]);
  assert.deepEqual(h.exclude, []);
});

test('hint points at an X on a star cell', () => {
  const { regions, solution } = Stars.generate(6);
  const m = emptyMarks(6);
  m[4][solution[4]] = 1;
  const h = Stars.hint(regions, m, solution);
  assert.equal(h.rule, 'wrong-x');
  assert.deepEqual(h.focus, [[4, solution[4]]]);
});

test('hint excludes cells around a placed star', () => {
  const { regions, solution } = Stars.generate(7);
  const m = emptyMarks(7);
  const s = [3, solution[3]];
  m[3][solution[3]] = 2;
  const h = Stars.hint(regions, m, solution);
  assert.equal(h.rule, 'around-star');
  const want = [];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++) if ((r !== s[0] || c !== s[1]) && conflict(regions, s, [r, c])) want.push([r, c]);
  assert.deepEqual(h.exclude, want);
});

test('hint never excludes a star cell, and hints alone solve every puzzle', () => {
  const used = {};
  for (let n = 5; n <= 9; n++)
    for (let k = 0; k < 40; k++) {
      const { regions, solution } = Stars.generate(n);
      const m = emptyMarks(n);
      let steps = 0;
      while (!Stars.isSolved(regions, m)) {
        assert.ok(++steps <= n * n + n, `n=${n} 힌트가 끝나지 않음`);
        const h = Stars.hint(regions, m, solution);
        used[h.rule] = (used[h.rule] || 0) + 1;
        assert.ok(!['wrong-star', 'wrong-x'].includes(h.rule), `틀린 표시가 없는데 ${h.rule}`);
        if (h.rule === 'place') {
          const [r, c] = h.focus[0];
          assert.equal(solution[r], c, 'place가 정답 칸이 아님');
          m[r][c] = 2;
          continue;
        }
        assert.ok(h.exclude.length > 0, `${h.rule}: 제외할 칸 없음`);
        for (const [r, c] of h.exclude) {
          assert.notEqual(solution[r], c, `${h.rule}가 정답 칸 (${r},${c})을 제외함`);
          assert.equal(m[r][c], 0, `${h.rule}가 이미 표시된 칸을 제외함`);
          m[r][c] = 1;
        }
        // X로 후보가 하나만 남은 줄·열·영역은 별을 놓아야 진행되므로, place 힌트가 그 역할을 한다
      }
    }
  console.log('  힌트 규칙 사용 횟수:', JSON.stringify(used));
  // 정답에 기대는 마지막 수단은 드물어야 한다
  const total = Object.values(used).reduce((a, b) => a + b);
  assert.ok((used.solution || 0) / total < 0.1, `solution 규칙 비율 ${(used.solution || 0)}/${total}`);
});
