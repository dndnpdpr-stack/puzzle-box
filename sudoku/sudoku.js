// 스도쿠 판 로직, 기법 엔진, 생성기, 힌트 (브라우저와 Node 양쪽에서 사용, DOM 없음)
// 판 grid: number[81] (i = r*9 + c, 0은 빈칸). 후보 masks: number[81], 숫자 d는 비트 1 << d.
(function (root) {
  const ALL = 0b1111111110;
  const rowOf = (i) => Math.floor(i / 9);
  const colOf = (i) => i % 9;
  const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
  const bitCount = (m) => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
  const digitsOf = (m) => { const out = []; for (let d = 1; d <= 9; d++) if (m & (1 << d)) out.push(d); return out; };

  const units = [];
  for (let k = 0; k < 9; k++) units.push({ type: 'row', index: k, cells: [...Array(9)].map((_, j) => k * 9 + j) });
  for (let k = 0; k < 9; k++) units.push({ type: 'col', index: k, cells: [...Array(9)].map((_, j) => j * 9 + k) });
  for (let k = 0; k < 9; k++) {
    const r0 = Math.floor(k / 3) * 3, c0 = (k % 3) * 3, cells = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cells.push((r0 + a) * 9 + c0 + b);
    units.push({ type: 'box', index: k, cells });
  }
  const PEERS = [...Array(81)].map((_, i) => {
    const s = new Set();
    for (const u of units) if (u.cells.includes(i)) for (const j of u.cells) if (j !== i) s.add(j);
    return [...s].sort((a, b) => a - b);
  });
  const peers = (i) => PEERS[i].slice();
  const sees = (a, b) => a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));

  function candidates(grid, elim) {
    const m = Array(81).fill(0);
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      let used = 0;
      for (const j of PEERS[i]) if (grid[j]) used |= 1 << grid[j];
      m[i] = ALL & ~used & ~(elim ? elim[i] : 0);
    }
    return m;
  }

  // 해를 최대 limit개까지 센다(후보가 가장 적은 칸부터 백트래킹). first가 있으면 첫 해를 담는다
  function countSolutions(grid, limit = 2, first) {
    const g = grid.slice();
    for (let i = 0; i < 81; i++) if (g[i] && PEERS[i].some((j) => g[j] === g[i])) return 0;
    const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
    for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; rows[rowOf(i)] |= b; cols[colOf(i)] |= b; boxes[boxOf(i)] |= b; }
    let count = 0;
    (function go() {
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const m = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
        const k = bitCount(m);
        if (k < bestN) { best = i; bestMask = m; bestN = k; if (k <= 1) break; }
      }
      if (best < 0) { if (!count && first) first.push(...g); count++; return; }
      if (!bestMask) return;
      const r = rowOf(best), c = colOf(best), b = boxOf(best);
      for (let d = 1; d <= 9 && count < limit; d++) {
        if (!(bestMask & (1 << d))) continue;
        const bit = 1 << d;
        g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        go();
        g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
    })();
    return count;
  }

  function solve(grid) {
    const out = [];
    return countSolutions(grid, 1, out) ? out : null;
  }

  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function randomFull(rng = Math.random) {
    const g = Array(81).fill(0);
    (function fill(i) {
      if (i === 81) return true;
      for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
        if (PEERS[i].some((j) => g[j] === d)) continue;
        g[i] = d;
        if (fill(i + 1)) return true;
      }
      g[i] = 0;
      return false;
    })(0);
    return g;
  }

  function isValidFull(grid) {
    if (grid.length !== 81 || grid.some((v) => !(v >= 1 && v <= 9))) return false;
    return units.every((u) => new Set(u.cells.map((i) => grid[i])).size === 9);
  }

  const api = { units, peers, candidates, countSolutions, solve, randomFull, isValidFull };
  if (typeof module !== 'undefined') module.exports = api; else root.Sudoku = api;
})(this);
