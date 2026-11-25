# 퍼즐 모음(puzzle-box) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마방진 하나뿐인 저장소를 퍼즐 고르기 화면 + 마방진 / 기사의 여행 / 별 배치 세 퍼즐을 담은 정적 사이트로 바꾼다.

**Architecture:** 퍼즐마다 폴더 하나(`index.html` + 로직 JS). 공통 토큰과 버튼 스타일은 루트 `common.css`. 로직 JS(`knight.js`, `stars.js`)는 `magic.js`와 같은 UMD 패턴(`module.exports` 또는 전역)이라 Node 테스트와 브라우저에서 같이 쓴다.

**Tech Stack:** HTML/CSS/바닐라 JS, 테스트는 Node 24 내장 `node:test` + `node:assert/strict` (외부 패키지 없음).

**Spec:** `docs/superpowers/specs/2026-11-25-puzzle-box-design.md`

## Global Constraints

- 정적 파일만. 빌드 도구, 프레임워크, 외부 라이브러리, `package.json` 없음. GitHub Pages가 `main` 루트를 그대로 서비스.
- 화면 문구는 한국어. 퍼즐 이름: "마방진", "기사의 여행", "별 배치".
- 각 퍼즐 페이지 상단에 `← 퍼즐 목록` 링크(`href="../"`).
- 별 배치에 뮤도쿠 이름, 고양이 그림, 뮤도쿠 화면 배치를 쓰지 않는다. 기호는 ★.
- 마방진 게임과 설명 페이지는 동작이 달라지면 안 되고, 화면은 `← 퍼즐 목록` 줄이 추가된 것 말고는 지금과 같아야 한다.
- 터치와 좁은 화면(폭 360px)에서 동작. 판 크기는 화면 폭에 맞춰 계산.
- 로직 JS는 DOM을 건드리지 않는다. 내보내기 형식: `const api = {...}; if (typeof module !== 'undefined') module.exports = api; else root.<Name> = api;` (`magic.js` 끝부분과 같음).
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **기사의 여행 힌트가 오래 걸리는 상태** (7×7/8×8 중반에 이미 막다른 길인 상태): 백트래킹이 끝나지 않을 수 있다. 탐색 노드 예산을 둔다. 예산 안에 판정이 안 나면 "여기서 완주 경로를 찾지 못했어요, 되돌려 보세요"를 띄우고 화면이 멈추면 안 된다 (Task 2 테스트 `budget`).
2. **5×5/7×7에서 여행이 불가능한 칸을 눌러 시작**: 시작하지 않고 안내하며, 판정은 즉시 끝나야 한다 (Task 2 테스트 `minority color`).
3. **별 배치 생성이 정답 하나를 못 맞추는 경우**: 조정 루프가 무한히 돌면 안 되고, 다시 만들기로 넘어가서 9×9도 1초 안에 끝나야 한다 (Task 4 테스트 `timing`).
4. **성공한 뒤나 "정답 보기" 뒤의 입력**: 두 퍼즐 모두 판을 잠그고 타이머를 멈춘다. 되돌리기, 힌트, 지우기는 아무것도 하지 않는다 (Task 3, 5 수동 확인 항목).
5. **좁은 화면에서 9×9 별 배치와 8×8 기사의 여행**: 가로 스크롤 없이 판이 화면 폭에 들어간다 (Task 3, 5 수동 확인 항목).

---

### Task 1: 공통 CSS + 마방진 폴더로 옮기기

**Files:**
- Create: `common.css`
- Move (`git mv`): `index.html` → `magic-square/index.html`, `guide.html` → `magic-square/guide.html`, `magic.js` → `magic-square/magic.js`
- Modify: `magic-square/index.html` (`<style>` 안에서 공통 부분을 빼고 `<link rel="stylesheet" href="../common.css">` 추가, `← 퍼즐 목록` 링크 추가)

**Interfaces:**
- Produces: `common.css`에 다음이 들어간다. 지금 `index.html`의 규칙을 글자 그대로 옮긴다: `:root` 토큰(`--bg --panel --ink --muted --line --given --accent --ok --bad --sel`)과 다크 `@media`, `*`, `body`, `main`, `h1`, `.sub`, `.controls`, `.seg`(+`button`, `:last-child`), `button`(+`:hover`, `.on`, `.primary`), `.label`, `.spacer`, `.status`(+`b`), `.msg`(+`.show`, `.win`, `.info`), `.help`. 새로 넣는 것: `.back { display:inline-block; margin-bottom:8px; font-size:14px; color:var(--accent); text-decoration:none; }`, `button:disabled { opacity:.45; cursor:default; }`. 다음 Task들의 페이지는 이 클래스를 그대로 쓴다.
- `guide.html`은 옮기기만 하고 내용은 바꾸지 않는다. guide 안의 `index.html` 링크는 같은 폴더라 그대로 동작한다.

- [ ] **Step 1: 옮기기 전 스크린샷 찍기.** Edge/Chrome headless로 `index.html`과 `guide.html`을 폭 1280과 390에서 찍어 scratchpad에 저장한다(예: `msedge --headless --screenshot=<path> --window-size=1280,1400 file:///D:/myproject/puzzle-box/index.html`).
- [ ] **Step 2: `git mv`로 세 파일을 옮기고 `common.css`를 만든다.** 위 규칙들을 `magic-square/index.html`에서 잘라 `common.css`로 옮기고, `<main>` 첫 줄에 `<a class="back" href="../">← 퍼즐 목록</a>`을 넣는다.
- [ ] **Step 3: 옮긴 뒤 같은 폭으로 다시 찍어 비교한다.** 결과: back 링크 줄 아래 화면이 Step 1과 같아야 한다(라이트, 다크는 `--force-dark-mode`로). 크기/난이도 바꾸기, 숫자 입력, 힌트, 정답 보기, "만드는 법 보기 →" 링크와 guide의 "← 마방진 퍼즐 게임으로" 링크를 손으로 한 번씩 눌러 본다.
- [ ] **Step 4: Node로 마방진 로직이 그대로인지 확인한다.**
  Run: `node -e "const M=require('./magic-square/magic.js');for(const n of [3,4,5,6,7,8])if(!M.isMagic(M.generate(n)))throw n;console.log('ok')"`
  Expected: `ok`
- [ ] **Step 5: 커밋** — `git commit -m "마방진을 magic-square/ 폴더로 옮기고 공통 스타일을 common.css로 분리"`

### Task 2: 기사의 여행 로직 (`knight.js`)

**Files:**
- Create: `knights-tour/knight.js`
- Test: `tests/knight.test.js`

**Interfaces:**
- Produces (전역 `Knight`):
  - `moves(n: number, r: number, c: number) -> [number, number][]`: 판 안의 L자 이동 칸 전부.
  - `nextMoves(n, path: [number, number][]) -> [number, number][]`: 마지막 칸에서 아직 안 밟은 이동 칸들. `path`가 비어 있으면 `[]`.
  - `solve(n, path: [number, number][], budget = 200000) -> { status: 'ok', path: [number, number][] } | { status: 'none' } | { status: 'timeout' }`: `path`(길이 ≥ 1)를 앞부분으로 하는 완주 경로를 찾는다. `'ok'`의 `path`는 길이 n²이고 앞부분이 입력과 같다. `budget`은 방문한 탐색 노드 수의 한도.
  - `canStart(n, r, c) -> boolean`: `solve(n, [[r, c]]).status === 'ok'`.
- 알고리즘: 재귀 백트래킹. 후보는 Warnsdorff 순서(남은 이동 칸 수가 적은 것 먼저, 같으면 판 중앙에서 먼 것 먼저). 가지치기 두 가지: (a) **색 짝맞춤**: 다음 칸부터 남은 칸은 흑백이 번갈아 나와야 하므로, 남은 칸 중 다음 칸 색의 수가 반대 색 수와 같거나 하나 많아야 한다. 아니면 `'none'`. (b) 현재 칸과 이웃하지 않은 안 밟은 칸 중 안 밟은 이웃이 0개인 칸이 있으면 막힌 것, 이웃이 1개인 칸이 2개 이상이어도 막힌 것.

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`tests/knight.test.js`, `require('../knights-tour/knight.js')`):
  - `moves`: `moves(8,0,0)`은 `[1,2]`와 `[2,1]` 두 칸(순서 무관), `moves(8,3,3)`은 8칸.
  - `tour from corner`: n = 5, 6, 7, 8 각각 `solve(n, [[0,0]])`의 status가 `'ok'`이고, 경로 길이가 n², 칸이 모두 다르고, 이웃한 두 칸이 L자 이동(|dr|·|dc| = 2)이다. 이 검사는 `assertTour(n, path)` 도우미 하나로 묶는다.
  - `every start on even boards`: n = 6, 8의 모든 칸에서 `canStart`가 `true`.
  - `minority color`: 5×5 `(0,1)`과 7×7 `(0,1)`에서 `solve`가 `{status:'none'}`이고, 7×7 판정이 50ms 안에 끝난다(`performance.now()`).
  - `continues prefix`: `solve(5, [[0,0],[1,2]])`가 `'ok'`이면 결과 경로 앞의 두 칸이 `[0,0],[1,2]`이다.
  - `budget`: 8×8에서 `solve(8, [[0,0]], 1)`은 `'timeout'`이고, 기본 예산으로 8×8 64칸 각각에서 시작했을 때 모두 1초 안에 판정이 끝난다.
- [ ] **Step 2: 실행해서 실패하는지 확인.** Run: `node --test tests/` Expected: FAIL (`Cannot find module`)
- [ ] **Step 3: 위 Interfaces대로 `knights-tour/knight.js`를 구현한다.**
- [ ] **Step 4: 실행해서 통과하는지 확인.** Run: `node --test tests/` Expected: 전부 PASS
- [ ] **Step 5: 커밋** — `git commit -m "기사의 여행 풀이기와 테스트 추가"`

### Task 3: 기사의 여행 페이지

**Files:**
- Create: `knights-tour/index.html` (`../common.css`와 `knight.js`를 불러옴, 페이지 전용 스타일과 스크립트는 안에)

**Interfaces:**
- Consumes: `Knight.moves`, `Knight.nextMoves`, `Knight.solve`, `Knight.canStart` (Task 2), `common.css` 클래스 (Task 1).

화면 구성(위에서부터): `← 퍼즐 목록`, `h1` "기사의 여행", `.sub` 규칙 한 줄("체스 나이트(L자 이동)로 모든 칸을 정확히 한 번씩 밟으세요. 시작 칸으로 돌아올 필요는 없습니다."), `.controls`[크기 `.seg` 5×5~8×8 · 도움 표시 켜기/끄기 버튼(`.on` 토글) · 되돌리기 · 다시 시작 · 힌트 · 무작위 시작 · `.primary` 새 게임], `.status`[밟은 칸 `k / n²` · 시간 · 힌트 사용], 판, `.msg`.

동작 (spec "기사의 여행" 절을 그대로 따른다):
- 판은 `<button>` 칸의 CSS grid. 칸 크기는 `min(64, floor((min(innerWidth, 720) - 32) / n) - 4)`px, 최소 32px. 체스판 무늬(`--panel`/`--given`). 밟은 칸에는 순서 번호, 현재 칸은 `--accent` 배경.
- 빈 판에서 칸을 누르면 `canStart`. false면 시작하지 않고 `.msg.info`로 "이 칸에서는 모든 칸을 밟을 수 없어요. 다른 칸을 골라 보세요." true면 그 칸이 1번이 되고 타이머가 시작된다.
- 무작위 시작: `canStart`가 true인 칸 중 무작위 하나로 시작한다.
- 진행 중에는 `nextMoves`에 있는 칸만 받는다. 도움 표시를 켜면 그 칸들에 `.can` 강조(테두리 `--accent`). 끄면 강조가 없다. 기본값은 켜짐.
- 막힘: `nextMoves`가 비었는데 칸이 남으면 "막혔어요. 되돌리기를 눌러 보세요."
- 힌트: `solve(n, path)`. `'ok'`면 경로의 다음 칸에 `.hint` 강조(되돌리기나 이동 전까지 유지)를 하고 힌트 수 +1. `'none'`이면 "여기서는 완주할 수 없어요, 되돌려 보세요", `'timeout'`이면 "여기서 완주 경로를 찾지 못했어요, 되돌려 보세요". 시작 전에는 아무것도 하지 않는다.
- 되돌리기: 마지막 칸을 뺀다(1번까지 빼면 시작 전 상태). 다시 시작: 같은 크기 빈 판, 타이머와 힌트 수 초기화. 새 게임: 다시 시작과 같다(크기 버튼도 새 게임).
- 다 밟으면 타이머 정지, 판 잠금, `.msg.win` "🎉 완주! n×n 판을 mm:ss만에 돌았습니다 (힌트 k회)." (힌트 0이면 괄호 생략).

- [ ] **Step 1: 페이지를 만든다.**
- [ ] **Step 2: 브라우저에서 확인한다** (폭 1280과 390): 5×5에서 `(0,1)`을 누르면 안내만 나오고 시작하지 않는다. 6×6을 힌트만 눌러서 완주하면 성공 메시지가 나오고, 그 뒤 칸/되돌리기/힌트가 반응하지 않는다. 일부러 막히게 하면 "막혔어요"가 나오고, 거기서 누른 힌트는 `'none'` 문구를 띄운다. 도움 표시를 끄면 강조가 사라진다. 390 폭 8×8에서 가로 스크롤이 생기지 않는다. 다크 모드에서도 칸이 구분된다. 콘솔 에러가 없다.
- [ ] **Step 3: 커밋** — `git commit -m "기사의 여행 페이지 추가"`

### Task 4: 별 배치 로직 (`stars.js`)

**Files:**
- Create: `star-battle/stars.js`
- Test: `tests/stars.test.js`

**Interfaces:**
- Produces (전역 `Stars`). 판 표기: `regions: number[][]` (n×n, 값은 영역 번호 0..n−1), 별 배치 `cols: number[]` (`cols[r]` = r번째 줄 별의 열), 화면 상태 `marks: number[][]` (0 빈칸, 1 X, 2 ★).
  - `generate(n: number, rng = Math.random) -> { regions: number[][], solution: number[] }`: 정답이 정확히 하나인 문제.
  - `solve(regions, limit = 2) -> number[][]`: 해를 최대 `limit`개까지 찾아 `cols` 배열로 돌려준다. 줄 단위 백트래킹(사용한 열과 영역은 비트마스크, 바로 윗줄 별과 |열 차이| ≤ 1이면 불가).
  - `conflicts(regions, marks) -> boolean[][]`: 같은 줄, 같은 열, 같은 영역, 이웃 8칸에 다른 ★이 있는 ★만 true.
  - `isSolved(regions, marks) -> boolean`: ★이 정확히 n개이고 `conflicts`가 모두 false.
- 생성 알고리즘:
  1. `cols`를 무작위로 만든다: 줄마다 남은 열을 섞어 윗줄 별과 붙지 않는 열을 고르는 백트래킹.
  2. 영역 i는 i번째 줄의 별 칸 하나로 시작한다. 아직 영역이 없는 칸 중 어떤 영역과 상하좌우로 맞닿은 칸 하나를 무작위로 골라, 맞닿은 영역 중 하나(무작위)에 붙인다. 모든 칸이 찰 때까지 반복한다.
  3. `solve(regions, 2)`가 해를 2개 돌려주면, 두 번째 해에만 별이 있는 칸 x를 찾는다. x의 상하좌우 이웃 중 x와 다른 영역 B가 있고 x를 빼도 x의 원래 영역 A가 연결된 채로 남으면 x를 B로 옮긴다. 그러면 두 번째 해는 B에 별이 2개가 되어 깨지고, 첫 해(=생성한 `cols`)는 그대로다(x는 첫 해의 별이 아님). 옮길 수 있는 칸이 없거나 조정을 4n번 해도 해가 하나가 아니면 2단계부터 다시, 그래도 안 되면 20번마다 1단계부터 다시 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`tests/stars.test.js`):
  - `generate is valid and unique`: n = 5..9 각각 10번. `regions`에 0..n−1이 모두 있고 영역마다 상하좌우로 연결되어 있다(BFS 도우미). `solution`의 별을 `marks`로 바꾸면 `isSolved`가 true. `solve(regions, 2)`의 결과가 정확히 `[solution]`이다(`deepEqual`).
  - `timing`: `generate(9)` 20번의 평균이 200ms 미만, 가장 오래 걸린 한 번이 1000ms 미만(휴대폰은 PC보다 몇 배 느리다고 보고 잡은 값).
  - `conflicts`: 5×5 영역을 손으로 정해 둔 판(줄 r = 영역 r)에서 ★ `(0,0)`과 `(0,3)`이면 둘 다 true(같은 줄). ★ `(0,0)`과 `(1,1)`이면 둘 다 true(대각선). ★ `(0,0)`과 `(2,3)`이면 둘 다 false. X(1)는 언제나 false.
  - `isSolved`: 정답에서 ★ 하나를 빼면 false, 정답에 X를 더 놓아도 true.
- [ ] **Step 2: 실행해서 실패하는지 확인.** Run: `node --test tests/` Expected: stars 테스트 FAIL
- [ ] **Step 3: 위 Interfaces대로 `star-battle/stars.js`를 구현한다.**
- [ ] **Step 4: 실행해서 통과하는지 확인.** Run: `node --test tests/` Expected: 전부 PASS (knight 테스트 포함)
- [ ] **Step 5: 커밋** — `git commit -m "별 배치 생성기·풀이기와 테스트 추가"`

### Task 5: 별 배치 페이지

**Files:**
- Create: `star-battle/index.html` (`../common.css`와 `stars.js`를 불러옴)

**Interfaces:**
- Consumes: `Stars.generate`, `Stars.conflicts`, `Stars.isSolved` (Task 4), `common.css` (Task 1).

화면 구성: `← 퍼즐 목록`, `h1` "별 배치", `.sub` 규칙 한 줄("가로줄, 세로줄, 색깔 영역마다 ★을 하나씩 놓으세요. ★끼리는 대각선을 포함해 서로 붙을 수 없습니다."), `.controls`[크기 `.seg` 5×5~9×9 · 되돌리기 · 지우기 · 힌트 · 정답 보기 · `.primary` 새 게임], `.status`[별 `k / n` · 시간 · 힌트 사용], 판, `.msg`, `.help`("칸을 누를 때마다 빈칸 → X → ★ → 빈칸으로 바뀝니다." 한 줄).

동작 (spec "별 배치" 절을 그대로 따른다):
- 영역 색 토큰 `--r0`~`--r8`은 페이지 `:root`에 둔다. 라이트는 연한 파스텔, 다크는 같은 색상의 어두운 톤(밝기 낮추고 채도 유지). 인접한 영역은 번호가 달라 색이 다르다. 영역 경계는 3px `--ink` 선, 같은 영역 안은 1px `--line` 선(칸마다 위/왼쪽 이웃과 영역을 비교해 테두리 두께를 정한다).
- 칸은 `<button>`. 칸 크기는 `min(56, floor((min(innerWidth, 720) - 32) / n))`px, 최소 34px. X는 `--muted` 색 `×`, ★은 `--ink`. `conflicts`가 true인 ★은 `--bad`.
- 누르기: 0 → 1 → 2 → 0. 바뀔 때마다 되돌리기 스택에 `[r, c, 이전 값]`을 넣는다.
- 지우기: 모든 칸을 0으로(한 번의 되돌리기로 복구되도록 스택에 통째로 넣는다).
- 힌트: 정답에 없는 자리의 ★이 있으면 그중 하나에 `.flag`(1.5초 깜빡임)를 걸고 "이 별은 정답 자리가 아니에요". 없으면 아직 안 놓은 정답 별 하나를 ★로 놓는다(되돌리기 스택에 넣는다). 어느 쪽이든 힌트 수 +1.
- 정답 보기: 정답 ★만 남기고 판을 잠근다, 타이머 정지, `.msg.info` "정답입니다. \"새 게임\"을 눌러 다시 도전하세요."
- 바뀔 때마다 `isSolved`가 true면 타이머 정지, 판 잠금, `.msg.win` "🎉 완성! n×n 별 배치를 mm:ss만에 풀었습니다 (힌트 k회)."
- 잠긴 뒤에는 칸, 되돌리기, 지우기, 힌트, 정답 보기가 아무것도 하지 않는다.
- 새 게임과 크기 버튼: `generate(n)`.

- [ ] **Step 1: 페이지를 만든다.**
- [ ] **Step 2: 브라우저에서 확인한다** (폭 1280과 390): 칸 상태가 세 가지로 돈다. 같은 줄/대각선에 ★ 두 개를 놓으면 둘 다 빨갛다. 틀린 ★이 있을 때 힌트를 누르면 그 칸을 짚고, 없을 때 누르면 ★을 하나 놓는다. 힌트만으로 끝까지 풀면 성공 메시지가 나오고 판이 잠긴다. 9×9에서 새 게임을 눌렀을 때 바로 나온다. 390 폭 9×9에서 가로 스크롤이 없다. 라이트와 다크에서 영역 9개가 서로 구분된다. 콘솔 에러가 없다.
- [ ] **Step 3: 커밋** — `git commit -m "별 배치 페이지 추가"`

### Task 6: 퍼즐 고르기 화면 + README

**Files:**
- Create: `index.html` (루트)
- Modify: `README.md` (다시 작성)

**Interfaces:**
- Consumes: `common.css`, 세 퍼즐 폴더의 `index.html`.

- [ ] **Step 1: `index.html`을 만든다.** `h1` "퍼즐 모음", `.sub` "골라서 바로 시작하세요." 그 아래 카드 3개(`<a class="card">`, 전체가 링크, 세로로 쌓다가 폭 ≥ 640에서 3열 grid). 카드 내용: 이름 + 한 줄 규칙.
  - 마방진 → `magic-square/`: "가로·세로·대각선 합이 모두 같도록 숫자를 채우기"
  - 기사의 여행 → `knights-tour/`: "나이트로 모든 칸을 한 번씩 밟기"
  - 별 배치 → `star-battle/`: "줄·열·색깔 영역마다 ★ 하나, 서로 붙지 않게"
- [ ] **Step 2: README를 다시 쓴다.** 제목 "퍼즐 모음", 플레이 링크 `https://dndnpdpr-stack.github.io/puzzle-box/`, 퍼즐별 한 단락(규칙, 크기, 버튼), 마방진 설명 페이지 링크 `https://dndnpdpr-stack.github.io/puzzle-box/magic-square/guide.html`, 지금 README의 마방진 "게임"과 "공식" 절은 마방진 단락 아래에 그대로 두기, 파일 구조 표(spec "구조" 절 기준), 테스트 실행법 `node --test tests/`, "퍼즐 추가는 폴더 하나 + 목록에 카드 하나".
- [ ] **Step 3: 확인한다.** 루트를 폭 1280과 390에서 열어 카드 세 개를 각각 누르면 해당 퍼즐이 열리고, 각 퍼즐의 `← 퍼즐 목록`이 루트로 돌아온다. `node --test tests/` 전부 PASS.
- [ ] **Step 4: 커밋** — `git commit -m "퍼즐 고르기 화면 추가, README를 퍼즐 모음 기준으로 다시 작성"`

### Task 7: 푸시와 Pages 확인

저장소 이름(`puzzle-box`), `origin` 주소, 로컬 폴더 이름은 이미 바뀌어 있다(`gh repo view` → `puzzle-box`, `origin` → `.../puzzle-box.git`, 작업 폴더 `D:\myproject\puzzle-box`). 그래서 spec "이름 바꾸기"의 1·4단계는 이미 끝났고 할 것은 2단계뿐이다.

- [ ] **Step 1: 푸시한다.** `git push origin main`
- [ ] **Step 2: Pages 배포를 기다렸다 확인한다.** `"C:\Program Files\GitHub CLI\gh.exe" api repos/dndnpdpr-stack/puzzle-box/pages/builds/latest --jq .status`가 `built`가 될 때까지 본다. 그 뒤 `curl -s -o /dev/null -w "%{http_code}"`로 `/puzzle-box/`, `/puzzle-box/magic-square/`, `/puzzle-box/magic-square/guide.html`, `/puzzle-box/knights-tour/`, `/puzzle-box/star-battle/`, `/puzzle-box/common.css`가 모두 `200`인지 확인한다.
- [ ] **Step 3: 휴대폰 폭(390)으로 배포된 주소에서 세 퍼즐을 한 판씩 해 본다** (spec "확인" 절).
