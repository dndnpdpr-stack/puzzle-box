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
