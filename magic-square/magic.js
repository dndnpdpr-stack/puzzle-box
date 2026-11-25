// 마방진 생성/검증 로직 (브라우저와 Node 양쪽에서 사용)
(function (root) {
  function odd(n) {
    const a = Array.from({ length: n }, () => Array(n).fill(0));
    let i = 0, j = (n - 1) / 2;
    for (let k = 1; k <= n * n; k++) {
      a[i][j] = k;
      const ni = (i - 1 + n) % n, nj = (j + 1) % n;
      if (a[ni][nj]) i = (i + 1) % n; else { i = ni; j = nj; }
    }
    return a;
  }

  function doublyEven(n) {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push([]);
      for (let j = 0; j < n; j++) {
        const v = i * n + j + 1;
        const flip = (i % 4 === j % 4) || ((i % 4) + (j % 4) === 3);
        a[i].push(flip ? n * n + 1 - v : v);
      }
    }
    return a;
  }

  // Strachey 방법 (n = 4k + 2)
  function singlyEven(n) {
    const m = n / 2, k = (n - 2) / 4, A = odd(m), m2 = m * m;
    const a = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++)
      for (let j = 0; j < m; j++) {
        a[i][j] = A[i][j];
        a[i + m][j + m] = A[i][j] + m2;
        a[i][j + m] = A[i][j] + 2 * m2;
        a[i + m][j] = A[i][j] + 3 * m2;
      }
    for (let i = 0; i < m; i++) {
      const cols = [];
      for (let c = 0; c < k; c++) cols.push(i === k ? c + 1 : c);
      for (let c = n - k + 1; c < n; c++) cols.push(c);
      for (const j of cols) {
        const t = a[i][j]; a[i][j] = a[i + m][j]; a[i + m][j] = t;
      }
    }
    return a;
  }

  function base(n) {
    if (n % 2 === 1) return odd(n);
    if (n % 4 === 0) return doublyEven(n);
    return singlyEven(n);
  }

  const rand = (x) => Math.floor(Math.random() * x);

  // 마방진 성질을 유지하는 변형으로 무작위화
  function generate(n) {
    let a = base(n);
    // 대칭 행/열 쌍 (i, n-1-i) 순열: 행과 열에 같은 순열을 적용하면 마방진 유지
    const half = Math.floor(n / 2);
    const perm = [...Array(half).keys()].sort(() => Math.random() - 0.5);
    const flips = perm.map(() => Math.random() < 0.5);
    const map = Array(n);
    for (let p = 0; p < half; p++) {
      let s = perm[p], t = n - 1 - perm[p];
      if (flips[p]) [s, t] = [t, s];
      map[p] = s; map[n - 1 - p] = t;
    }
    if (n % 2 === 1) map[half] = half;
    a = map.map((r) => map.map((c) => a[r][c]));
    // 회전 / 반사
    const rot = rand(4);
    for (let r = 0; r < rot; r++) a = a[0].map((_, j) => a.map((row) => row[j]).reverse());
    if (Math.random() < 0.5) a = a.map((row) => row.slice().reverse());
    // 보수 변환
    if (Math.random() < 0.5) a = a.map((row) => row.map((v) => n * n + 1 - v));
    return a;
  }

  function magicSum(n) { return (n * (n * n + 1)) / 2; }

  function isMagic(a) {
    const n = a.length, S = magicSum(n), seen = new Set();
    let d1 = 0, d2 = 0;
    for (let i = 0; i < n; i++) {
      let r = 0, c = 0;
      for (let j = 0; j < n; j++) {
        const v = a[i][j];
        if (!(v >= 1 && v <= n * n) || seen.has(v)) return false;
        seen.add(v); r += v; c += a[j][i];
      }
      if (r !== S || c !== S) return false;
      d1 += a[i][i]; d2 += a[i][n - 1 - i];
    }
    return d1 === S && d2 === S;
  }

  // 변형 없이 공식 그대로 만든 마방진
  // 홀수: 1이 맨 윗줄 가운데 / 4의 배수: 1이 오른쪽 아래 모서리 / 6, 10…: 1이 (0, (n/2-1)/2)
  const formula = base;

  const api = { generate, formula, isMagic, magicSum };
  if (typeof module !== 'undefined') module.exports = api; else root.Magic = api;
})(this);
