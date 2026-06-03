# 멜론 익스텐션 로그인 상태별 팝업 구현 요약

## 요약

멜론 익스텐션 팝업이 열릴 때 로그인 상태를 확인하고, 상태에 따라 다른 화면을 보여주도록 구현했다.

로그인 확인은 멜론의 공식 세션 API를 쓰는 방식이 아니라, content script가 멜론 페이지 안에서 인증 필요 URL에 `credentials: 'include'` 요청을 보내고, 멜론 서버가 반환한 HTML/최종 URL을 해석하는 방식이다.

## 상태 분기

| 상태 | 의미 | 팝업 동작 |
|---|---|---|
| `LOGGED_IN` | 멜론 서버가 로그인된 세션으로 정상 HTML을 반환했고 `plylstSeq`도 찾음 | 전체 추출 버튼 표시 |
| `LOGGED_OUT` | 로그인 페이지 또는 예외 페이지 신호가 반환됨 | 로그인 안내 + 멜론 로그인 탭 열기 |
| `PLAYLIST_IDS_NOT_FOUND` | 로그인은 확인됐지만 HTML에서 플레이리스트 ID를 못 찾음 | 비로그인과 분리해 목록 ID 미발견 안내 |
| `UNKNOWN` | 요청 실패 등으로 상태 판정 불가 | 다시 확인 안내 |

## 구현 구조

### 팝업

- 팝업이 열리면 active tab이 `melon.com`인지 확인한다.
- 멜론 탭이면 content script에 `CHECK_MELON_SESSION` 메시지를 보낸다.
- 결과에 따라 다음 화면을 렌더링한다.
  - 멜론 탭 아님
  - content script 미주입
  - 비로그인
  - 로그인됨
  - 로그인됐지만 플레이리스트 ID 미발견

### Content Script

- `CHECK_MELON_SESSION` 메시지를 처리한다.
- `checkMelonSession()`을 실행해 로그인 상태를 반환한다.
- 기존 `EXTRACT_ALL` 메시지도 유지한다.

### 멜론 클라이언트

- `classifyMelonSessionHtml(finalUrl, html)`로 로그인 상태를 판정한다.
- 로그인 페이지 신호:
  - `login_form`
  - `member-login`
  - `카카오계정 로그인`
  - `accounts.melon.com`
- 예외 페이지 신호:
  - `mymusiccommon_exception`
- 정상 응답이면 HTML에서 `plylstSeq`를 파싱해 플레이리스트 개수를 확인한다.

## 주요 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/types.ts` | `CHECK_MELON_SESSION`, 세션 상태 타입 추가 |
| `src/lib/melonClient.ts` | 세션 판정 함수와 `checkMelonSession()` 추가 |
| `src/content/index.tsx` | `CHECK_MELON_SESSION` 메시지 처리 추가 |
| `src/popup/App.tsx` | 상태별 팝업 UI 분기 추가 |
| `src/lib/melonClient.test.ts` | 로그인 판정 단위 테스트 추가 |

## 검증 결과

```bash
pnpm test src/lib/melonClient.test.ts src/lib/melonParser.test.ts
```

결과:

```text
Test Files  2 passed (2)
Tests  10 passed (10)
```

```bash
pnpm build
```

결과:

```text
✓ built
```

## 현실적 한계

- 멜론 서버 내부 세션을 직접 조회하는 구조는 아니다.
- 브라우저의 멜론 쿠키를 포함해 요청하고, 멜론 서버가 반환하는 응답으로 세션 유효성을 간접 판정한다.
- 로그인 여부와 플레이리스트 ID 추출 가능 여부는 별도 문제다.
- 로그인은 됐지만 `plylstSeq`가 HTML에 없으면 `PLAYLIST_IDS_NOT_FOUND`로 분리해 표시한다.
