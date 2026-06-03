# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# 프로젝트 지침 (Project-specific)

## 커밋 컨벤션 (Conventional Commits)

**사용자가 커밋을 요청하면, 반드시 아래 Conventional Commits 형식으로 메시지를 작성한다.**

### 형식

```
<type>: <subject>

<body>
```

- **type** — 소문자 영어. 변경 성격에 맞는 것을 고른다:
  | type | 용도 |
  |---|---|
  | `feat` | 새 기능 추가 |
  | `fix` | 버그 수정 |
  | `docs` | 문서만 변경 (README, CLAUDE.md, docs/ 등) |
  | `chore` | 빌드/설정/스캐폴딩/의존성 등 기능과 무관한 잡무 |
  | `refactor` | 동작 변화 없는 코드 구조 개선 |
  | `test` | 테스트 추가/수정 |
  | `perf` | 성능 개선 |
  | `style` | 포맷·세미콜론 등 비기능적 변경 |
  | `build` / `ci` | 빌드 시스템 / CI 설정 |

- **subject** — 한 줄 요약. 한국어 사용 가능, 마침표 없이 간결하게.
- **body** — 빈 줄 뒤에 **왜(why)** 와 맥락을 한국어로 설명 (사소한 변경은 생략 가능).

### 규칙

- 서로 다른 성격의 변경은 **type별로 커밋을 분리**한다 (예: 기능 + 문서 → `feat` 1개 + `docs` 1개).
- 커밋 전 `git status`/`git diff`로 staged 범위를 확인하고, **요청한 변경만** 담는다. 내가 만들지 않았거나 무관한 파일은 임의로 포함하지 않고 먼저 확인한다.
- 커밋 후 `git log --oneline`으로 결과를 보여준다.
- **push는 사용자가 명시적으로 요청할 때만** 한다.

### 예시 (이 레포의 기존 커밋)

```
feat: dev 서버 포트를 5175로 변경 (5173/5174 충돌 회피)
docs: CRXJS 내부 아키텍처 분석 문서 추가
chore: CRXJS + React + Vite + TypeScript 크롬 익스텐션 스타터 구성
```
