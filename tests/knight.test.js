const test = require('node:test');
const assert = require('node:assert/strict');
const Knight = require('../knights-tour/knight.js');

function assertTour(n, path) {
  assert.equal(path.length, n * n);
  const seen = new Set();
  path.forEach(([r, c], k) => {
    assert.ok(r >= 0 && r < n && c >= 0 && c < n, `판 밖: ${r},${c}`);
    seen.add(r * n + c);
    if (k > 0) {
      const [pr, pc] = path[k - 1];
      assert.equal(Math.abs(r - pr) * Math.abs(c - pc), 2, `L자 아님: ${k}`);
    }
  });
  assert.equal(seen.size, n * n);
}

const key = (cells) => cells.map(([r, c]) => `${r},${c}`).sort();

test('moves', () => {
  assert.deepEqual(key(Knight.moves(8, 0, 0)), key([[1, 2], [2, 1]]));
  assert.equal(Knight.moves(8, 3, 3).length, 8);
});

test('nextMoves skips visited cells', () => {
  assert.deepEqual(Knight.nextMoves(8, []), []);
  assert.deepEqual(key(Knight.nextMoves(8, [[1, 2], [0, 0]])), key([[2, 1]]));
});

test('tour from corner', () => {
  for (const n of [5, 6, 7, 8]) {
    const res = Knight.solve(n, [[0, 0]]);
    assert.equal(res.status, 'ok', `n=${n}`);
    assertTour(n, res.path);
  }
});

test('every start on even boards', () => {
  for (const n of [6, 8])
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) assert.ok(Knight.canStart(n, r, c), `n=${n} ${r},${c}`);
});

test('minority color', () => {
  assert.deepEqual(Knight.solve(5, [[0, 1]]), { status: 'none' });
  const t = performance.now();
  assert.deepEqual(Knight.solve(7, [[0, 1]]), { status: 'none' });
  assert.ok(performance.now() - t < 50, '7×7 판정이 느림');
  assert.equal(Knight.canStart(5, 0, 1), false);
});

test('continues prefix', () => {
  const res = Knight.solve(5, [[0, 0], [1, 2]]);
  if (res.status === 'ok') {
    assertTour(5, res.path);
    assert.deepEqual(res.path.slice(0, 2), [[0, 0], [1, 2]]);
  } else assert.equal(res.status, 'none');
});

test('budget', () => {
  assert.deepEqual(Knight.solve(8, [[0, 0]], 1), { status: 'timeout' });
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const t = performance.now();
      const res = Knight.solve(8, [[r, c]]);
      assert.ok(performance.now() - t < 1000, `8×8 ${r},${c} 느림`);
      assert.ok(['ok', 'none', 'timeout'].includes(res.status));
    }
});

test('dead end mid-game is judged quickly', () => {
  // 5×5에서 모서리 (0,4)를 외딴 칸으로 만든 상태: (1,2)와 (2,3)을 이미 밟았다.
  const path = [[0, 0], [1, 2], [2, 4], [4, 3], [3, 1], [1, 0], [0, 2], [2, 3]];
  const t = performance.now();
  const res = Knight.solve(5, path);
  assert.equal(res.status, 'none');
  assert.ok(performance.now() - t < 200);
});
