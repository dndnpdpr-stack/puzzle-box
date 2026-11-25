// 별 배치 생성기, 풀이기, 검증 (브라우저와 Node 양쪽에서 사용, DOM 없음)
// regions: n×n 영역 번호(0..n-1), cols: cols[r] = r번째 줄 별의 열, marks: 0 빈칸 / 1 X / 2 ★
(function (root) {
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 해를 최대 limit개까지 찾는다
  function solve(regions, limit = 2) {
    const n = regions.length, out = [], cols = [];
    (function row(r, colMask, regMask, prev) {
      if (out.length >= limit) return;
      if (r === n) { out.push(cols.slice()); return; }
      for (let c = 0; c < n; c++) {
        const g = regions[r][c];
        if (colMask & (1 << c) || regMask & (1 << g) || (r > 0 && Math.abs(c - prev) <= 1)) continue;
        cols[r] = c;
        row(r + 1, colMask | (1 << c), regMask | (1 << g), c);
        if (out.length >= limit) return;
      }
    })(0, 0, 0, -9);
    return out;
  }

  // 규칙을 만족하는 별 배치를 무작위로 만든다
  function randomPlacement(n, rng) {
    const cols = [];
    (function row(r, used) {
      if (r === n) return true;
      for (const c of shuffle([...Array(n).keys()], rng)) {
        if (used & (1 << c) || (r > 0 && Math.abs(c - cols[r - 1]) <= 1)) continue;
        cols[r] = c;
        if (row(r + 1, used | (1 << c))) return true;
      }
      return false;
    })(0, 0);
    return cols;
  }

  // 각 별에서 영역을 무작위로 키운다
  function growRegions(n, cols, rng) {
    const regions = Array.from({ length: n }, () => Array(n).fill(-1));
    cols.forEach((c, r) => (regions[r][c] = r));
    let left = n * n - n;
    while (left > 0) {
      const frontier = [];
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          if (regions[r][c] !== -1) continue;
          for (const [dr, dc] of DIRS4) {
            const a = r + dr, b = c + dc;
            if (a >= 0 && a < n && b >= 0 && b < n && regions[a][b] !== -1) { frontier.push([r, c, regions[a][b]]); }
          }
        }
      const [r, c, g] = frontier[Math.floor(rng() * frontier.length)];
      regions[r][c] = g;
      left--;
    }
    return regions;
  }

  // (r, c)를 빼도 그 칸의 영역이 이어져 있는가
  function staysConnected(regions, r, c) {
    const n = regions.length, g = regions[r][c], cells = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (regions[a][b] === g && (a !== r || b !== c)) cells.push([a, b]);
    if (!cells.length) return false;
    const seen = new Set([cells[0][0] * n + cells[0][1]]), stack = [cells[0]];
    while (stack.length) {
      const [a, b] = stack.pop();
      for (const [dr, dc] of DIRS4) {
        const x = a + dr, y = b + dc;
        if (x < 0 || x >= n || y < 0 || y >= n || (x === r && y === c) || regions[x][y] !== g) continue;
        if (!seen.has(x * n + y)) { seen.add(x * n + y); stack.push([x, y]); }
      }
    }
    return seen.size === cells.length;
  }

  // 다른 해의 별 칸 하나를 이웃 영역으로 옮겨 그 해를 깨뜨린다. 옮기면 true
  function breakSolution(regions, cols, other, rng) {
    const n = regions.length;
    const rows = shuffle([...Array(n).keys()].filter((r) => other[r] !== cols[r]), rng);
    for (const r of rows) {
      const c = other[r], g = regions[r][c];
      if (!staysConnected(regions, r, c)) continue;
      const targets = [];
      for (const [dr, dc] of DIRS4) {
        const a = r + dr, b = c + dc;
        if (a >= 0 && a < n && b >= 0 && b < n && regions[a][b] !== g) targets.push(regions[a][b]);
      }
      if (!targets.length) continue;
      regions[r][c] = targets[Math.floor(rng() * targets.length)];
      return true;
    }
    return false;
  }

  function generate(n, rng = Math.random) {
    for (;;) {
      const cols = randomPlacement(n, rng);
      for (let grow = 0; grow < 20; grow++) {
        const regions = growRegions(n, cols, rng);
        for (let step = 0; step <= 4 * n; step++) {
          const sols = solve(regions, 2);
          if (sols.length === 1) return { regions, solution: cols };
          const other = sols.find((s) => s.some((c, r) => c !== cols[r]));
          if (!breakSolution(regions, cols, other, rng)) break;
        }
      }
    }
  }

  function conflicts(regions, marks) {
    const n = regions.length, stars = [];
    const out = Array.from({ length: n }, () => Array(n).fill(false));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (marks[r][c] === 2) stars.push([r, c]);
    for (let i = 0; i < stars.length; i++)
      for (let j = i + 1; j < stars.length; j++) {
        const [a, b] = stars[i], [x, y] = stars[j];
        const clash = a === x || b === y || regions[a][b] === regions[x][y] || (Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1);
        if (clash) { out[a][b] = true; out[x][y] = true; }
      }
    return out;
  }

  function isSolved(regions, marks) {
    const n = regions.length;
    let count = 0;
    for (const row of marks) for (const v of row) if (v === 2) count++;
    if (count !== n) return false;
    return conflicts(regions, marks).every((row) => row.every((v) => !v));
  }

  const api = { generate, solve, conflicts, isSolved };
  if (typeof module !== 'undefined') module.exports = api; else root.Stars = api;
})(this);
