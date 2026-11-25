// 기사의 여행 규칙과 풀이기 (브라우저와 Node 양쪽에서 사용, DOM 없음)
(function (root) {
  const JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

  function moves(n, r, c) {
    const out = [];
    for (const [dr, dc] of JUMPS) {
      const a = r + dr, b = c + dc;
      if (a >= 0 && a < n && b >= 0 && b < n) out.push([a, b]);
    }
    return out;
  }

  function nextMoves(n, path) {
    if (!path.length) return [];
    const seen = new Set(path.map(([r, c]) => r * n + c));
    const [r, c] = path[path.length - 1];
    return moves(n, r, c).filter(([a, b]) => !seen.has(a * n + b));
  }

  // path를 앞부분으로 하는 완주 경로를 찾는다.
  // 결과: { status: 'ok', path } | { status: 'none' } | { status: 'timeout' }
  function solve(n, path, budget = 200000) {
    const N = n * n;
    const adj = [];
    for (let i = 0; i < N; i++) adj.push(moves(n, Math.floor(i / n), i % n).map(([a, b]) => a * n + b));
    const center = (n - 1) / 2;
    const far = (i) => Math.abs(Math.floor(i / n) - center) + Math.abs((i % n) - center);

    const visited = new Uint8Array(N);
    const deg = new Int8Array(N); // 안 밟은 이웃 수
    const left = [0, 0]; // 안 밟은 칸 수 (색 0, 색 1)
    for (let i = 0; i < N; i++) {
      deg[i] = adj[i].length;
      left[(Math.floor(i / n) + (i % n)) & 1]++;
    }
    const color = (i) => (Math.floor(i / n) + (i % n)) & 1;
    const order = [];
    const visit = (i) => {
      visited[i] = 1; order.push(i); left[color(i)]--;
      for (const j of adj[i]) deg[j]--;
    };
    const unvisit = (i) => {
      visited[i] = 0; order.pop(); left[color(i)]++;
      for (const j of adj[i]) deg[j]++;
    };

    for (const [r, c] of path) {
      const i = r * n + c;
      if (visited[i]) return { status: 'none' };
      if (order.length && !adj[order[order.length - 1]].includes(i)) return { status: 'none' };
      visit(i);
    }

    let nodes = 0, timedOut = false;

    // 현재 칸 cur에서 남은 칸을 모두 밟을 가능성이 아직 있는가
    function feasible(cur) {
      const rest = N - order.length;
      if (rest === 0) return true;
      // 색 짝맞춤: 다음 칸은 cur의 반대 색, 그 뒤로 번갈아 나온다
      const nc = 1 - color(cur);
      const need = Math.ceil(rest / 2);
      if (left[nc] !== need || left[1 - nc] !== rest - need) return false;
      // 외딴 칸: 안 밟은 이웃이 없는 칸은 cur 바로 다음이면서 마지막일 때만 가능
      let ends = 0;
      for (let i = 0; i < N; i++) {
        if (visited[i]) continue;
        const nearCur = adj[cur].includes(i);
        if (deg[i] === 0) { if (!(nearCur && rest === 1)) return false; }
        else if (deg[i] === 1 && !nearCur) { if (++ends > 1) return false; }
      }
      return true;
    }

    function dfs() {
      if (order.length === N) return true;
      if (++nodes > budget) { timedOut = true; return false; }
      const cur = order[order.length - 1];
      if (!feasible(cur)) return false;
      const cand = adj[cur].filter((j) => !visited[j]);
      cand.sort((a, b) => deg[a] - deg[b] || far(b) - far(a));
      for (const j of cand) {
        visit(j);
        if (dfs()) return true;
        unvisit(j);
        if (timedOut) return false;
      }
      return false;
    }

    if (!order.length) return { status: 'none' };
    if (dfs()) return { status: 'ok', path: order.map((i) => [Math.floor(i / n), i % n]) };
    return timedOut ? { status: 'timeout' } : { status: 'none' };
  }

  function canStart(n, r, c) {
    return solve(n, [[r, c]]).status === 'ok';
  }

  const api = { moves, nextMoves, solve, canStart };
  if (typeof module !== 'undefined') module.exports = api; else root.Knight = api;
})(this);
