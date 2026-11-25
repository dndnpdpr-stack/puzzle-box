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
