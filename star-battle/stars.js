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

  // 힌트: 정답 별을 바로 보여주지 않고, 지금 상태에서 논리로 제외할 수 있는 칸과 그 이유를 찾는다.
  // 결과: { rule, exclude: [[r,c]...] (X를 놓을 칸), focus: [[r,c]...] (근거로 강조할 칸), unit?, units?, target? }
  // rule 순서(쉬운 것부터): wrong-star, wrong-x, around-star, single, place, confined, attack, pigeonhole, solution
  function hint(regions, marks, solution) {
    const n = regions.length;
    const cellsWhere = (f) => {
      const out = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (f(r, c)) out.push([r, c]);
      return out;
    };
    const clash = ([a, b], [c, d]) =>
      a === c || b === d || regions[a][b] === regions[c][d] || (Math.abs(a - c) <= 1 && Math.abs(b - d) <= 1);
    const same = ([a, b], [c, d]) => a === c && b === d;

    // 1. 틀린 표시
    const wrongStar = cellsWhere((r, c) => marks[r][c] === 2 && solution[r] !== c);
    if (wrongStar.length) return { rule: 'wrong-star', exclude: [], focus: [wrongStar[0]] };
    const wrongX = cellsWhere((r, c) => marks[r][c] === 1 && solution[r] === c);
    if (wrongX.length) return { rule: 'wrong-x', exclude: [], focus: [wrongX[0]] };

    // 2. 놓인 ★ 주변
    const stars = cellsWhere((r, c) => marks[r][c] === 2);
    const around = cellsWhere((r, c) => marks[r][c] === 0 && stars.some((s) => clash(s, [r, c])));
    if (around.length) {
      const focus = stars.filter((s) => around.some((p) => clash(s, p)));
      return { rule: 'around-star', exclude: around, focus };
    }

    // 이제 빈칸은 모두 후보(★이 없는 줄·열·영역에 있고 어떤 ★과도 겹치지 않음)
    const cand = cellsWhere((r, c) => marks[r][c] === 0);
    const units = [];
    for (let i = 0; i < n; i++) {
      units.push({ type: 'row', index: i, has: ([r]) => r === i });
      units.push({ type: 'col', index: i, has: ([, c]) => c === i });
      units.push({ type: 'region', index: i, has: ([r, c]) => regions[r][c] === i });
    }
    const open = units
      .filter((u) => !stars.some(u.has))
      .map((u) => ({ type: u.type, index: u.index, has: u.has, cells: cand.filter(u.has) }));
    const pub = (u) => ({ type: u.type, index: u.index });

    // 3. 후보가 하나뿐인 줄·열·영역: 그 칸과 겹치는 후보는 제외. 제외할 것이 없으면 ★을 놓으라고 알려준다
    const singles = open.filter((u) => u.cells.length === 1);
    for (const u of singles) {
      const p = u.cells[0];
      const ex = cand.filter((q) => !same(p, q) && clash(p, q));
      if (ex.length) return { rule: 'single', unit: pub(u), exclude: ex, focus: [p] };
    }
    if (singles.length) return { rule: 'place', unit: pub(singles[0]), exclude: [], focus: [singles[0].cells[0]] };

    // 4. 갇힘: 영역의 후보가 한 줄(열)에만 있으면 그 줄의 다른 후보 제외. 줄(열)의 후보가 한 영역에만 있으면 그 영역의 다른 후보 제외
    for (const u of open) {
      if (u.type === 'region') {
        for (const [axis, type] of [[0, 'row'], [1, 'col']]) {
          const lines = new Set(u.cells.map((p) => p[axis]));
          if (lines.size !== 1) continue;
          const line = [...lines][0];
          const ex = cand.filter((q) => q[axis] === line && regions[q[0]][q[1]] !== u.index);
          if (ex.length) return { rule: 'confined', unit: pub(u), target: { type, index: line }, exclude: ex, focus: u.cells };
        }
      } else {
        const regs = new Set(u.cells.map(([r, c]) => regions[r][c]));
        if (regs.size !== 1) continue;
        const g = [...regs][0];
        const ex = cand.filter((q) => regions[q[0]][q[1]] === g && !u.has(q));
        if (ex.length) return { rule: 'confined', unit: pub(u), target: { type: 'region', index: g }, exclude: ex, focus: u.cells };
      }
    }

    // 5. 막는 칸: 여기에 ★을 놓으면 다른 줄·열·영역의 후보가 모두 사라진다
    for (const u of open) {
      const killers = cand.filter((p) => !u.has(p) && u.cells.every((q) => clash(p, q)));
      if (killers.length) return { rule: 'attack', unit: pub(u), exclude: killers, focus: u.cells };
    }

    // 6. 비둘기집: 영역 k개의 후보가 줄(열) k개 안에 갇히면 그 줄들의 다른 후보 제외. 반대로 줄 k개가 영역 k개 안에 갇혀도 같다
    const openRegions = open.filter((u) => u.type === 'region');
    for (const [axis, type] of [[0, 'row'], [1, 'col']]) {
      const lines = open.filter((u) => u.type === type);
      // 줄 묶음 → 그 안에 갇힌 영역들
      for (let mask = 1; mask < 1 << lines.length; mask++) {
        const set = lines.filter((_, i) => mask & (1 << i));
        if (set.length < 2 || set.length >= lines.length) continue;
        const idx = new Set(set.map((u) => u.index));
        const inside = openRegions.filter((g) => g.cells.every((p) => idx.has(p[axis])));
        if (inside.length !== set.length) continue;
        const gs = new Set(inside.map((g) => g.index));
        const ex = cand.filter((q) => idx.has(q[axis]) && !gs.has(regions[q[0]][q[1]]));
        if (ex.length) return { rule: 'pigeonhole', units: inside.map(pub), target: { type, indices: [...idx] }, exclude: ex, focus: inside.flatMap((g) => g.cells) };
      }
      // 영역 묶음 → 그 안에 갇힌 줄들
      for (let mask = 1; mask < 1 << openRegions.length; mask++) {
        const set = openRegions.filter((_, i) => mask & (1 << i));
        if (set.length < 2 || set.length >= openRegions.length) continue;
        const gs = new Set(set.map((g) => g.index));
        const inside = lines.filter((u) => u.cells.every(([r, c]) => gs.has(regions[r][c])));
        if (inside.length !== set.length) continue;
        const idx = new Set(inside.map((u) => u.index));
        const ex = cand.filter((q) => gs.has(regions[q[0]][q[1]]) && !idx.has(q[axis]));
        if (ex.length) return { rule: 'pigeonhole', units: inside.map(pub), target: { type: 'region', indices: [...gs] }, exclude: ex, focus: inside.flatMap((u) => u.cells) };
      }
    }

    // 7. 마지막 수단: 정답에 없는 후보 하나
    const off = cand.filter(([r, c]) => solution[r] !== c);
    if (off.length) return { rule: 'solution', exclude: [off[0]], focus: [] };
    const on = cand[0];
    return { rule: 'place', exclude: [], focus: on ? [on] : [] };
  }

  const api = { generate, solve, conflicts, isSolved, hint };
  if (typeof module !== 'undefined') module.exports = api; else root.Stars = api;
})(this);
