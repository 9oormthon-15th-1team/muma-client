# Muma — 멜론 플레이리스트 추출기 (POC 설계)

- 작성일: 2026-06-03
- 상태: 설계 확정 대기 → 구현 계획 단계로 이행 예정
- 베이스: 기존 `muma-client` (CRXJS + React + Vite, Manifest V3)

## 1. 목표 (한 문장)

> melon.com에 로그인된 사용자가 확장 프로그램 팝업의 버튼 하나를 누르면,
> 그 세션으로 **내 모든 플레이리스트와 수록곡을 추출**해 팝업 화면에 표시한다.

## 2. 실현 가능성 검증 결과

| 단계 | 가능성 | 근거 |
|---|---|---|
| 곡목록 추출 (`listSong.htm?plylstSeq=`) | ✅ **확정** | 비로그인 curl로도 `HTTP 200` + 수록곡 30곡 HTML(89KB) 반환 확인 (`Referer` 헤더 필요) |
| 내 플레이리스트 목록 enumerate | 🟡 **거의 확실** | `mymusicplaylist_list.htm` 페이지 실재 확인. 비로그인 시 `mymusiccommon_exception.htm?returnType=NOTEXIST`로 리다이렉트 → 로그인 세션 필요. 콘텐츠 스크립트가 세션 자동 공유하므로 동작 예상 |
| 세션 / 쿠키 / CORS | ✅ **문제 없음** | melon.com에 주입된 콘텐츠 스크립트는 same-origin → 세션 쿠키 자동 포함, CORS 없음 |
| 파싱 | ✅ 쉬움 | 응답이 JSON이 아니라 HTML → `DOMParser`로 파싱 |

**결론: 현실적으로 구현 가능하고 오늘 당장 POC 가능.** 유일한 미확정은 "내 플레이리스트 목록" 엔드포인트의 정확한 이름·파라미터·응답 형식 하나이며, 로그인 상태 DevTools로 즉시 확정 가능.

### 검증에 사용한 엔드포인트

```
# 플레이리스트 정보 페이지 (사용자 제공)
https://www.melon.com/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=446121958

# 곡 목록 endpoint (검증 완료 — 비로그인 200 + HTML)
https://www.melon.com/mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=446121958
  - 필요 헤더: Referer: .../mymusicplaylistview_inform.htm?plylstSeq=...

# 내 플레이리스트 목록 페이지 (실재 확인, 로그인 필요)
https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm
```

## 3. 아키텍처

**콘텐츠 스크립트가 fetch를 수행하는 방식**을 채택한다. 백그라운드 서비스 워커에서 직접 fetch하면 `host_permissions` + SameSite 쿠키를 따로 다뤄야 하지만, melon.com에 주입된 콘텐츠 스크립트는 same-origin이라 세션 쿠키가 자동 포함되고 CORS도 없다.

| 컴포넌트 | 경로 | 역할 |
|---|---|---|
| 팝업 | `src/popup` | "내 플레이리스트 전체 추출" 버튼 + 진행상태 + 결과 테이블 렌더 |
| 콘텐츠 스크립트 | `src/content` | melon.com 탭에서 fetch + 파싱 수행. 팝업 메시지 수신 |
| 파서 모듈 | `src/lib/melonParser.ts` | HTML 문자열 → 구조화 객체. 순수 함수 (단위 테스트 가능) |
| 백그라운드 | `src/background` | POC에선 미사용 또는 단순 중계. 팝업↔콘텐츠 직접 통신으로 충분 |

manifest 변경: `content_scripts.matches`를 `<all_urls>` → `https://www.melon.com/*`로 좁힌다.

## 4. 데이터 흐름

```
[팝업] "전체 추출" 버튼 클릭
  → chrome.tabs.sendMessage(activeTab, { type: 'EXTRACT_ALL' })

[콘텐츠 스크립트] (melon.com 탭, 로그인 세션 보유)
  1. 내 플레이리스트 목록 fetch → plylstSeq[] 파싱   ← POC 0단계에서 엔드포인트 확정
  2. for each seq (순차 + 200~500ms 딜레이):
       fetch listSong.htm?plylstSeq=seq (Referer 헤더 포함)
       → 곡 배열 파싱 [{ title, artist, album, songId }]
  3. 취합: { playlists: [{ seq, title, songs: [...] }] }
  → 팝업에 응답

[팝업] 결과를 테이블/리스트로 렌더 (플레이리스트별 곡 목록)
```

## 5. 데이터 모델 (POC)

```ts
interface Song {
  songId: string
  title: string
  artist: string
  album: string
}

interface Playlist {
  seq: string        // plylstSeq
  title: string
  songCount: number
  songs: Song[]
}

interface ExtractResult {
  playlists: Playlist[]
  extractedAt: string
}
```

## 6. POC 0단계 (구현 전 먼저 할 일)

유일한 미확정 항목을 닫는다. 사용자가 직접:

1. melon.com 로그인
2. `내 음악 > 플레이리스트` 페이지 열기
3. DevTools Network 탭에서 **플레이리스트 목록을 반환하는 요청** 캡처
   - URL / 쿼리 파라미터
   - 응답 형식 (HTML vs JSON)
   - 페이지네이션 파라미터 유무 (플레이리스트가 많을 때)
4. 곡목록 페이징도 함께 확인 (수록곡 30개 초과 플레이리스트의 `startIndex`류 파라미터 유무)

→ 이 정보 확보 후 구현 착수.

## 7. 에러 처리 / 현실 고려사항

- **비로그인 상태 클릭**: 콘텐츠 스크립트가 `mymusiccommon_exception` 리다이렉트 감지 시 "멜론에 로그인 후 다시 시도" 안내
- **곡 30개 초과 페이징**: POC 0단계에서 페이징 파라미터 확인 후 반복 fetch
- **rate-limit**: 플레이리스트 간 fetch에 200~500ms 딜레이 (차단 회피)
- **ToS**: 본인 계정의 본인 데이터를 개인 용도로 추출. 리스크는 낮으나 멜론 약관상 자동 스크래핑은 회색지대라는 점 인지 (개인 POC 전제)

## 8. POC 범위 밖 (YAGNI)

- 서버/외부 API 전송
- OAuth / 별도 인증
- 다른 음악 서비스 지원
- 증분 동기화 · 예약 실행
- JSON 파일 다운로드 (1차 출력은 팝업 화면 표시만)

## 9. 성공 기준

- [ ] melon.com 로그인 상태에서 팝업 버튼 클릭 시, 내 플레이리스트 N개가 팝업에 목록으로 표시된다
- [ ] 각 플레이리스트를 펼치면 수록곡(곡명/아티스트/앨범)이 표시된다
- [ ] 비로그인 상태에서는 명확한 안내 메시지가 표시된다
- [ ] `melonParser.ts`의 HTML→객체 파싱이 단위 테스트로 검증된다
