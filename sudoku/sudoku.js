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

  // ---- 기법 엔진 ----
  // 결과 Step: { tech, level, place?: {cell, digit}, eliminate?: [{cell, digit}], focus: 근거 칸들, unit?: {type, index}, line?: {type, index}, digits?: [] }
  const unitRef = (u) => ({ type: u.type, index: u.index });
  function combos(arr, k, start = 0, pick = [], out = []) {
    if (pick.length === k) { out.push(pick.slice()); return out; }
    for (let i = start; i < arr.length; i++) { pick.push(arr[i]); combos(arr, k, i + 1, pick, out); pick.pop(); }
    return out;
  }
  const placedIn = (grid, u) => u.cells.reduce((m, i) => (grid[i] ? m | (1 << grid[i]) : m), 0);
  const cellsWith = (grid, masks, cells, d) => cells.filter((i) => !grid[i] && masks[i] & (1 << d));
  const LINES = units.filter((u) => u.type !== 'box');
  const BOXES = units.filter((u) => u.type === 'box');
  const lineOf = (type, i) => (type === 'row' ? units[rowOf(i)] : units[9 + colOf(i)]);

  function hiddenSingle(grid, masks) {
    for (const u of units) {
      const placed = placedIn(grid, u);
      for (let d = 1; d <= 9; d++) {
        if (placed & (1 << d)) continue;
        const cs = cellsWith(grid, masks, u.cells, d);
        if (cs.length === 1) return { tech: 'hidden-single', level: 1, place: { cell: cs[0], digit: d }, unit: unitRef(u), focus: u.cells.filter((i) => i !== cs[0]) };
      }
    }
    return null;
  }

  function nakedSingle(grid, masks) {
    for (let i = 0; i < 81; i++)
      if (!grid[i] && bitCount(masks[i]) === 1) {
        const d = digitsOf(masks[i])[0];
        return { tech: 'naked-single', level: 1, place: { cell: i, digit: d }, focus: PEERS[i].filter((j) => grid[j]) };
      }
    return null;
  }

  // 박스 안 d가 한 줄에만(pointing), 또는 줄 안 d가 한 박스에만(box-line)
  function intersections(grid, masks) {
    for (const box of BOXES)
      for (let d = 1; d <= 9; d++) {
        const cs = cellsWith(grid, masks, box.cells, d);
        if (cs.length < 2) continue;
        for (const type of ['row', 'col']) {
          const line = lineOf(type, cs[0]);
          if (!cs.every((i) => line.cells.includes(i))) continue;
          const ex = cellsWith(grid, masks, line.cells, d).filter((i) => !box.cells.includes(i));
          if (ex.length) return { tech: 'pointing', level: 2, unit: unitRef(box), line: unitRef(line), digits: [d], focus: cs, eliminate: ex.map((cell) => ({ cell, digit: d })) };
        }
      }
    for (const line of LINES)
      for (let d = 1; d <= 9; d++) {
        const cs = cellsWith(grid, masks, line.cells, d);
        if (cs.length < 2) continue;
        const box = units[18 + boxOf(cs[0])];
        if (!cs.every((i) => boxOf(i) === box.index)) continue;
        const ex = cellsWith(grid, masks, box.cells, d).filter((i) => !line.cells.includes(i));
        if (ex.length) return { tech: 'box-line', level: 2, unit: unitRef(line), line: unitRef(box), digits: [d], focus: cs, eliminate: ex.map((cell) => ({ cell, digit: d })) };
      }
    return null;
  }

  const NAMES = { 2: 'pair', 3: 'triple' };
  function nakedSubset(grid, masks, k) {
    for (const u of units) {
      const empty = u.cells.filter((i) => !grid[i]);
      const small = empty.filter((i) => bitCount(masks[i]) >= 2 && bitCount(masks[i]) <= k);
      for (const set of combos(small, k)) {
        const union = set.reduce((m, i) => m | masks[i], 0);
        if (bitCount(union) !== k) continue;
        const ex = [];
        for (const i of empty) if (!set.includes(i)) for (const d of digitsOf(masks[i] & union)) ex.push({ cell: i, digit: d });
        if (ex.length) return { tech: `naked-${NAMES[k]}`, level: 2, unit: unitRef(u), digits: digitsOf(union), focus: set, eliminate: ex };
      }
    }
    return null;
  }

  function hiddenSubset(grid, masks, k) {
    for (const u of units) {
      const placed = placedIn(grid, u);
      const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !(placed & (1 << d)));
      const where = {};
      for (const d of ds) where[d] = cellsWith(grid, masks, u.cells, d);
      const okDs = ds.filter((d) => where[d].length >= 2 && where[d].length <= k);
      for (const set of combos(okDs, k)) {
        const cells = [...new Set(set.flatMap((d) => where[d]))];
        if (cells.length !== k) continue;
        const keep = set.reduce((m, d) => m | (1 << d), 0);
        const ex = [];
        for (const i of cells) for (const d of digitsOf(masks[i] & ~keep)) ex.push({ cell: i, digit: d });
        if (ex.length) return { tech: `hidden-${NAMES[k]}`, level: 2, unit: unitRef(u), digits: set, focus: cells, eliminate: ex };
      }
    }
    return null;
  }

  // X-Wing(k=2), Swordfish(k=3): d가 줄 k개에서 반대 방향 줄 k개에만
  function fish(grid, masks, k) {
    for (let d = 1; d <= 9; d++)
      for (const [base, cover] of [['row', 'col'], ['col', 'row']]) {
        const pos = (i) => (cover === 'col' ? colOf(i) : rowOf(i));
        const lines = LINES.filter((u) => u.type === base)
          .map((u) => ({ u, cs: cellsWith(grid, masks, u.cells, d) }))
          .filter((x) => x.cs.length >= 2 && x.cs.length <= k);
        for (const set of combos(lines, k)) {
          const covers = new Set(set.flatMap((x) => x.cs.map(pos)));
          if (covers.size !== k) continue;
          const baseIdx = new Set(set.map((x) => x.u.index));
          const ex = [];
          for (const ci of covers) {
            const coverUnit = units[(cover === 'row' ? 0 : 9) + ci];
            for (const i of cellsWith(grid, masks, coverUnit.cells, d)) {
              const b = base === 'row' ? rowOf(i) : colOf(i);
              if (!baseIdx.has(b)) ex.push({ cell: i, digit: d });
            }
          }
          if (ex.length) return { tech: k === 2 ? 'x-wing' : 'swordfish', level: 3, line: { type: cover, index: -1 }, digits: [d], focus: set.flatMap((x) => x.cs), eliminate: ex };
        }
      }
    return null;
  }

  function xyWing(grid, masks) {
    const bi = [];
    for (let i = 0; i < 81; i++) if (!grid[i] && bitCount(masks[i]) === 2) bi.push(i);
    for (const p of bi) {
      const [x, y] = digitsOf(masks[p]);
      const wings = bi.filter((w) => w !== p && sees(p, w));
      for (const a of wings)
        for (const b of wings) {
          const ma = masks[a], mb = masks[b];
          if (!(ma & (1 << x)) || ma & (1 << y) || !(mb & (1 << y)) || mb & (1 << x)) continue;
          const za = ma & ~(1 << x), zb = mb & ~(1 << y);
          if (za !== zb) continue;
          const z = digitsOf(za)[0];
          const ex = [];
          for (let i = 0; i < 81; i++)
            if (i !== p && i !== a && i !== b && !grid[i] && masks[i] & za && sees(i, a) && sees(i, b)) ex.push({ cell: i, digit: z });
          if (ex.length) return { tech: 'xy-wing', level: 3, digits: [z], focus: [p, a, b], eliminate: ex };
        }
    }
    return null;
  }

  function findStep(grid, masks) {
    return hiddenSingle(grid, masks) || nakedSingle(grid, masks) || intersections(grid, masks)
      || nakedSubset(grid, masks, 2) || hiddenSubset(grid, masks, 2)
      || nakedSubset(grid, masks, 3) || hiddenSubset(grid, masks, 3)
      || fish(grid, masks, 2) || fish(grid, masks, 3) || xyWing(grid, masks);
  }

  // 한 수를 판·후보에 적용
  function applyStep(grid, masks, st) {
    if (st.place) {
      const { cell, digit } = st.place;
      grid[cell] = digit; masks[cell] = 0;
      for (const j of PEERS[cell]) masks[j] &= ~(1 << digit);
    }
    for (const e of st.eliminate || []) masks[e.cell] &= ~(1 << e.digit);
  }

  // 기법만으로 풀어 보고, 필요한 가장 높은 단계를 돌려준다(막히면 level null)
  function grade(puzzle) {
    const g = puzzle.slice(), masks = candidates(g), steps = [];
    let level = 0;
    for (;;) {
      if (g.every((v) => v)) return { level: Math.max(level, 1), steps };
      const st = findStep(g, masks);
      if (!st) return { level: null, steps };
      steps.push(st);
      level = Math.max(level, st.level);
      applyStep(g, masks, st);
    }
  }

  // ---- 생성기 ----
  // 완성 판에서 점대칭 쌍(i, 80-i)을 무작위 순서로 지운다. 정답이 하나로 유지될 때만 지우고,
  // keep(g)가 false를 돌려주면 그 쌍은 되돌린다. stop(g)가 true면 멈춘다.
  function dig(full, rng, keep, stop) {
    const g = full.slice();
    const pairs = shuffle([...Array(41).keys()], rng);
    for (const i of pairs) {
      if (stop && stop(g)) break;
      const j = 80 - i, vi = g[i], vj = g[j];
      g[i] = 0; g[j] = 0;
      if (countSolutions(g) !== 1 || (keep && !keep(g))) { g[i] = vi; g[j] = vj; }
    }
    return g;
  }
  const clues = (g) => g.reduce((k, v) => k + (v ? 1 : 0), 0);

  function generate(level, rng = Math.random) {
    for (;;) {
      const solution = randomFull(rng);
      let puzzle;
      if (level === 1) {
        puzzle = dig(solution, rng, (g) => grade(g).level === 1, (g) => clues(g) <= 37);
        const k = clues(puzzle);
        if (k < 36 || k > 45) continue;
      } else {
        puzzle = dig(solution, rng);
        if (grade(puzzle).level !== level) continue;
      }
      return { puzzle, solution, level };
    }
  }

  // ---- 힌트 ----
  // 틀린 숫자가 있으면 그 칸, 없으면 지금 판(확정 숫자 − 힌트가 이미 적용한 제외 elim)에서 다음 한 수
  function hint(grid, solution, elim) {
    const wrong = grid.findIndex((v, i) => v && v !== solution[i]);
    if (wrong >= 0) return { rule: 'wrong', focus: [wrong] };
    if (grid.every((v) => v)) return { rule: 'done' };
    const st = findStep(grid, candidates(grid, elim));
    return st ? { rule: 'step', ...st } : { rule: 'stuck' };
  }

  const api = { units, peers, candidates, countSolutions, solve, randomFull, isValidFull, findStep, grade, generate, hint };
  if (typeof module !== 'undefined') module.exports = api; else root.Sudoku = api;
})(this);
