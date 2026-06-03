# 멜론 플레이리스트 추출기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** melon.com에 로그인된 사용자가 확장 프로그램 팝업의 버튼을 누르면, 그 세션으로 내 모든 플레이리스트와 수록곡을 추출해 팝업에 표시한다.

**Architecture:** melon.com에 주입된 콘텐츠 스크립트가 same-origin fetch(세션 쿠키 자동 포함)로 멜론 내부 엔드포인트를 호출한다. 응답 HTML은 순수 함수 파서(`melonParser`)가 구조화 객체로 변환한다. 팝업이 활성 탭의 콘텐츠 스크립트에 메시지를 보내 추출을 트리거하고 결과를 받아 렌더한다.

**Tech Stack:** TypeScript, React 18, CRXJS + Vite (MV3), Vitest + jsdom (단위 테스트), DOMParser.

**전제 / 검증 상태:**
- `mymusicplaylistview_listSong.htm?plylstSeq=N` → 곡목록 HTML 반환: **실호출 검증 완료**. 행 구조도 확인됨.
- `mymusicplaylist_list.htm` → 내 플레이리스트 목록: **로그인 시에만 정상**(비로그인 시 `mymusiccommon_exception` 리다이렉트). 정확한 DOM은 Task 6 수동 검증에서 실제 로그인 페이지로 확정한다. 그래서 enumerate 파서는 DOM 구조에 덜 민감한 정규식 방식을 쓴다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json` | vitest/jsdom devDeps + `test` 스크립트 추가 (수정) |
| `vitest.config.ts` | jsdom 환경 설정 (생성) |
| `src/lib/types.ts` | `Song`, `Playlist`, `ExtractResult`, 메시지 타입 (생성) |
| `src/lib/melonParser.ts` | `parseSongList(html)`, `parsePlaylistSeqs(html)` — 순수 함수 (생성) |
| `src/lib/melonParser.test.ts` | 파서 단위 테스트 (생성) |
| `src/lib/melonClient.ts` | `fetchSongList(seq)`, `fetchPlaylistListHtml()`, `extractAll()` — fetch 래퍼 + 오케스트레이션 (생성) |
| `src/content/index.tsx` | `EXTRACT_ALL` 메시지 수신 → `extractAll()` 실행 → 응답 (수정) |
| `src/popup/Popup.tsx` | 버튼 + 로딩 + 결과 테이블 (생성) |
| `src/popup/main.tsx` / `index.html` | 팝업 엔트리 (기존 스타터 구조에 맞춰 수정) |
| `manifest.config.ts` | `content_scripts.matches`를 멜론으로 한정 (수정) |

---

## Task 1: 테스트 도구 추가 (vitest + jsdom)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: vitest/jsdom 설치**

Run:
```bash
pnpm add -D vitest@^2.1.8 jsdom@^25.0.1
```
Expected: devDependencies에 vitest, jsdom 추가됨.

- [ ] **Step 2: `package.json`에 test 스크립트 추가**

`scripts`에 다음 줄 추가:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: `vitest.config.ts` 생성**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: 빈 테스트로 러너 동작 확인**

임시 파일 `src/lib/smoke.test.ts` 생성:
```ts
import { test, expect } from 'vitest'
test('smoke', () => { expect(1 + 1).toBe(2) })
```
Run: `pnpm test`
Expected: PASS (1 passed). 확인 후 `src/lib/smoke.test.ts` 삭제.

- [ ] **Step 5: 커밋**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test: vitest + jsdom 테스트 환경 추가"
```

---

## Task 2: 타입 정의

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: 타입 작성**

```ts
export interface Song {
  songId: string
  trackNo: number
  title: string
  artist: string
  album: string
}

export interface Playlist {
  seq: string
  title: string
  songCount: number
  songs: Song[]
}

export interface ExtractResult {
  playlists: Playlist[]
  extractedAt: string
}

/** 팝업 → 콘텐츠 스크립트 */
export interface ExtractAllRequest {
  type: 'EXTRACT_ALL'
}

/** 콘텐츠 스크립트 → 팝업 */
export type ExtractAllResponse =
  | { ok: true; result: ExtractResult }
  | { ok: false; error: string }
```

- [ ] **Step 2: 타입체크**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/types.ts
git commit -m "feat: 플레이리스트 추출 도메인 타입 정의"
```

---

## Task 3: 곡목록 파서 `parseSongList` (TDD)

실제 멜론 HTML 구조 기준. 각 곡은 `<tr>`이며 `input.input_check[value]`=songId, `td.no`=트랙번호, `a.fc_gray`=곡명, `.wrapArtistName a`=아티스트, `a[href*=goAlbumDetail]`=앨범. 헤더 `수록곡 (N)`에 총 곡 수.

**Files:**
- Create: `src/lib/melonParser.ts`
- Create: `src/lib/melonParser.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/melonParser.test.ts`:
```ts
import { test, expect } from 'vitest'
import { parseSongList } from './melonParser'

// 실제 listSong.htm 응답에서 발췌한 2곡 구조
const FIXTURE = `
<div class="section_playlist">
<h3 class="title arr">수록곡 <span class="cnt">(2)</span></h3>
<table>
<tbody>
<tr>
  <td><div class="wrap pd_none left">
    <input type="checkbox" class="input_check" name="input_check" value="1644933" />
  </div></td>
  <td class="no"><div class="wrap">1</div></td>
  <td class="t_left"><div class="wrap pd_none"><div class="ellipsis">
    <a href="javascript:melon.play.playSong('75010101',1644933);" class="fc_gray" title="언젠가 이곳이 재생 - 새 창">언젠가 이곳이</a>
  </div></div></td>
  <td class="t_left"><div class="wrap wrapArtistName"><div id="artistName" class="ellipsis">
    <a href="javascript:melon.link.goArtistDetail('261143');" class="fc_mgray">이수</a>
  </div></div></td>
  <td class="t_left"><div class="wrap"><div class="ellipsis">
    <a href="javascript:melon.link.goAlbumDetail('352036');" class="fc_mgray">뮤지컬 대장금 OST &#x27;언젠가 이곳이&#x27;</a>
  </div></div></td>
</tr>
<tr>
  <td><div class="wrap pd_none left">
    <input type="checkbox" class="input_check" name="input_check" value="3801596" />
  </div></td>
  <td class="no"><div class="wrap">2</div></td>
  <td class="t_left"><div class="wrap pd_none"><div class="ellipsis">
    <a href="javascript:melon.play.playSong('75010101',3801596);" class="fc_gray" title="돌고 돌아도 재생 - 새 창">돌고 돌아도</a>
  </div></div></td>
  <td class="t_left"><div class="wrap wrapArtistName"><div id="artistName" class="ellipsis">
    <a href="javascript:melon.link.goArtistDetail('52607');" class="fc_mgray">XIA (준수)</a>
  </div></div></td>
  <td class="t_left"><div class="wrap"><div class="ellipsis">
    <a href="javascript:melon.link.goAlbumDetail('2123615');" class="fc_mgray">Tarantallegra</a>
  </div></div></td>
</tr>
</tbody>
</table>
</div>`

test('parseSongList: 곡 수와 각 필드를 추출한다', () => {
  const songs = parseSongList(FIXTURE)
  expect(songs).toHaveLength(2)
  expect(songs[0]).toEqual({
    songId: '1644933',
    trackNo: 1,
    title: '언젠가 이곳이',
    artist: '이수',
    album: "뮤지컬 대장금 OST '언젠가 이곳이'", // HTML 엔티티 디코딩 확인
  })
  expect(songs[1].songId).toBe('3801596')
  expect(songs[1].artist).toBe('XIA (준수)')
  expect(songs[1].album).toBe('Tarantallegra')
})

test('parseSongList: 곡이 없으면 빈 배열', () => {
  expect(parseSongList('<div class="section_playlist"></div>')).toEqual([])
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/melonParser.test.ts`
Expected: FAIL ("parseSongList is not a function" 또는 import 에러).

- [ ] **Step 3: 최소 구현**

`src/lib/melonParser.ts`:
```ts
import type { Song } from './types'

function text(el: Element | null): string {
  return (el?.textContent ?? '').trim()
}

export function parseSongList(html: string): Song[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr'))
  const songs: Song[] = []
  for (const row of rows) {
    const checkbox = row.querySelector('input.input_check') as HTMLInputElement | null
    if (!checkbox || !checkbox.value) continue // 곡 행이 아님 (헤더 등)
    const songId = checkbox.value
    const trackNo = parseInt(text(row.querySelector('td.no')), 10) || 0
    const title = text(row.querySelector('a.fc_gray'))
    const artist = text(row.querySelector('.wrapArtistName a'))
    const album = text(row.querySelector('a[href*="goAlbumDetail"]'))
    songs.push({ songId, trackNo, title, artist, album })
  }
  return songs
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/melonParser.test.ts`
Expected: PASS (2 passed). `textContent`가 `&#x27;`를 `'`로 자동 디코딩하므로 album 단언 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/melonParser.ts src/lib/melonParser.test.ts
git commit -m "feat: 멜론 곡목록 HTML 파서 구현 (TDD)"
```

---

## Task 4: 플레이리스트 목록 파서 `parsePlaylistSeqs` (TDD)

목록 페이지 DOM이 로그인 상태에서만 확인 가능하므로, DOM 구조에 덜 민감한 방식으로 `mymusicplaylistview_inform.htm?plylstSeq=N` 링크에서 seq를 수집한다. 제목은 해당 앵커의 텍스트에서 추출(없으면 seq fallback). 정확도는 Task 6에서 실제 페이지로 검증한다.

**Files:**
- Modify: `src/lib/melonParser.ts`
- Modify: `src/lib/melonParser.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/lib/melonParser.test.ts` 하단에 추가:
```ts
import { parsePlaylistSeqs } from './melonParser'

const LIST_FIXTURE = `
<ul class="list_playlist">
  <li>
    <a href="/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=446121958">내 인생 플리</a>
  </li>
  <li>
    <a href="/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=500000001">운동할 때</a>
  </li>
  <li>
    <a href="/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=446121958">중복은 무시</a>
  </li>
</ul>`

test('parsePlaylistSeqs: 중복 제거하고 seq+title 추출', () => {
  const result = parsePlaylistSeqs(LIST_FIXTURE)
  expect(result).toEqual([
    { seq: '446121958', title: '내 인생 플리' },
    { seq: '500000001', title: '운동할 때' },
  ])
})

test('parsePlaylistSeqs: 항목 없으면 빈 배열', () => {
  expect(parsePlaylistSeqs('<div></div>')).toEqual([])
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/melonParser.test.ts`
Expected: FAIL ("parsePlaylistSeqs is not a function").

- [ ] **Step 3: 구현 추가**

`src/lib/melonParser.ts`에 추가:
```ts
export interface PlaylistRef {
  seq: string
  title: string
}

export function parsePlaylistSeqs(html: string): PlaylistRef[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const anchors = Array.from(
    doc.querySelectorAll('a[href*="mymusicplaylistview_inform.htm"]'),
  ) as HTMLAnchorElement[]
  const seen = new Set<string>()
  const refs: PlaylistRef[] = []
  for (const a of anchors) {
    const match = a.getAttribute('href')?.match(/plylstSeq=(\d+)/)
    if (!match) continue
    const seq = match[1]
    if (seen.has(seq)) continue
    seen.add(seq)
    refs.push({ seq, title: (a.textContent ?? '').trim() || seq })
  }
  return refs
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/melonParser.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/melonParser.ts src/lib/melonParser.test.ts
git commit -m "feat: 플레이리스트 목록 seq 파서 구현 (TDD)"
```

---

## Task 5: fetch 래퍼 + 오케스트레이션 `melonClient`

콘텐츠 스크립트는 melon.com과 same-origin이므로 상대 경로 fetch 시 세션 쿠키가 자동 포함된다. `referrer` 옵션으로 멜론이 기대하는 Referer를 명시한다(브라우저는 same-origin referrer 설정을 허용).

**Files:**
- Create: `src/lib/melonClient.ts`

- [ ] **Step 1: 작성**

```ts
import { parseSongList, parsePlaylistSeqs } from './melonParser'
import type { ExtractResult, Playlist } from './types'

const LIST_URL = '/mymusic/playlist/mymusicplaylist_list.htm'
// NOTE: 정확한 목록 URL/파라미터는 Task 6 수동 검증에서 확정. 페이징이 있으면 여기 보강.

const EXCEPTION_MARK = 'mymusiccommon_exception'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url: string, referrer?: string): Promise<string> {
  const res = await fetch(url, {
    credentials: 'include',
    ...(referrer ? { referrer } : {}),
  })
  if (!res.ok) throw new Error(`요청 실패: ${url} (HTTP ${res.status})`)
  // 비로그인 시 예외 페이지로 리다이렉트되는지 최종 URL로 감지
  if (res.url.includes(EXCEPTION_MARK)) {
    throw new Error('NOT_LOGGED_IN')
  }
  return res.text()
}

export async function fetchPlaylistListHtml(): Promise<string> {
  return fetchText(LIST_URL)
}

export async function fetchSongListHtml(seq: string): Promise<string> {
  const url = `/mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=${seq}`
  const referrer = `${location.origin}/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=${seq}`
  return fetchText(url, referrer)
}

export async function extractAll(): Promise<ExtractResult> {
  const listHtml = await fetchPlaylistListHtml()
  const refs = parsePlaylistSeqs(listHtml)
  const playlists: Playlist[] = []
  for (const ref of refs) {
    const songHtml = await fetchSongListHtml(ref.seq)
    const songs = parseSongList(songHtml)
    playlists.push({
      seq: ref.seq,
      title: ref.title,
      songCount: songs.length,
      songs,
    })
    await sleep(300) // rate-limit 회피
  }
  return { playlists, extractedAt: new Date().toISOString() }
}
```

- [ ] **Step 2: 타입체크**

Run: `pnpm typecheck`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/melonClient.ts
git commit -m "feat: 멜론 fetch 래퍼 및 전체 추출 오케스트레이션"
```

---

## Task 6: 콘텐츠 스크립트 — EXTRACT_ALL 처리 + manifest 한정

**Files:**
- Modify: `src/content/index.tsx`
- Modify: `manifest.config.ts`

- [ ] **Step 1: manifest matches를 멜론으로 한정**

`manifest.config.ts`의 `content_scripts`를 수정:
```ts
  content_scripts: [
    {
      matches: ['https://www.melon.com/*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],
```

- [ ] **Step 2: 콘텐츠 스크립트에 메시지 리스너 작성**

`src/content/index.tsx` 전체를 다음으로 교체:
```tsx
import { extractAll } from '../lib/melonClient'
import type { ExtractAllRequest, ExtractAllResponse } from '../lib/types'

chrome.runtime.onMessage.addListener(
  (msg: ExtractAllRequest, _sender, sendResponse: (r: ExtractAllResponse) => void) => {
    if (msg?.type !== 'EXTRACT_ALL') return
    extractAll()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        sendResponse({ ok: false, error: message })
      })
    return true // 비동기 응답을 위해 채널 유지
  },
)
```

- [ ] **Step 3: 타입체크 + 빌드**

Run: `pnpm typecheck && pnpm build`
Expected: 에러 없음, `dist/` 생성.

- [ ] **Step 4: 수동 검증 — 목록 엔드포인트 확정 (POC 0단계)**

1. `chrome://extensions`에서 개발자 모드 → "압축해제된 확장 프로그램 로드" → `dist/` 선택
2. melon.com 로그인 → `내 음악 > 플레이리스트` 페이지 이동
3. DevTools Console에서 직접 검증:
   ```js
   const h = await (await fetch('/mymusic/playlist/mymusicplaylist_list.htm', {credentials:'include'})).text()
   console.log(h.match(/plylstSeq=\d+/g)?.slice(0,10), h.length)
   ```
   - `plylstSeq=...`가 잡히면 `LIST_URL` 그대로 OK.
   - 안 잡히거나 예외 페이지면, Network 탭에서 실제 목록 요청을 찾아 `src/lib/melonClient.ts`의 `LIST_URL`을 교정하고 Step 3부터 재실행.
4. 곡 수가 30 초과인 플레이리스트가 있으면 `listSong.htm` 응답이 전곡을 포함하는지(페이징 파라미터 필요 여부) 확인. 페이징 필요 시 `fetchSongListHtml`에 반복 로직 추가(후속).

- [ ] **Step 5: 커밋**

```bash
git add manifest.config.ts src/content/index.tsx
git commit -m "feat: 콘텐츠 스크립트 EXTRACT_ALL 처리 및 melon 도메인 한정"
```

---

## Task 7: 팝업 UI — 버튼 + 로딩 + 결과 테이블

**Files:**
- Create: `src/popup/Popup.tsx`
- Modify: `src/popup/main.tsx` (기존 스타터 엔트리 — 실제 파일명 확인 후 맞춤)

- [ ] **Step 1: 기존 팝업 엔트리 구조 확인**

Run: `ls src/popup && cat src/popup/*.tsx`
Expected: 엔트리 파일(예: `main.tsx`)과 마운트 대상(`#root`) 확인. 아래 Step 2에서 그 엔트리가 `Popup`을 렌더하도록 맞춘다.

- [ ] **Step 2: `Popup.tsx` 작성**

```tsx
import { useState } from 'react'
import type { ExtractAllResponse, ExtractResult } from '../lib/types'

export function Popup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractResult | null>(null)

  async function handleExtract() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id || !tab.url?.includes('melon.com')) {
        setError('melon.com 탭에서 실행해주세요.')
        return
      }
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_ALL',
      })) as ExtractAllResponse
      if (res.ok) {
        setResult(res.result)
      } else {
        setError(
          res.error === 'NOT_LOGGED_IN'
            ? '멜론에 로그인 후 다시 시도해주세요.'
            : `추출 실패: ${res.error}`,
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: 360, padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 16, margin: '0 0 12px' }}>멜론 플레이리스트 추출</h1>
      <button onClick={handleExtract} disabled={loading}>
        {loading ? '추출 중…' : '내 플레이리스트 전체 추출'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <p>플레이리스트 {result.playlists.length}개</p>
          {result.playlists.map((pl) => (
            <details key={pl.seq} style={{ marginBottom: 8 }}>
              <summary>
                {pl.title} ({pl.songCount}곡)
              </summary>
              <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
                {pl.songs.map((s) => (
                  <li key={s.songId}>
                    {s.title} — {s.artist}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 엔트리에서 Popup 렌더하도록 수정**

Step 1에서 확인한 엔트리 파일에서 기존 스타터 컴포넌트 대신 `Popup`을 렌더:
```tsx
import { createRoot } from 'react-dom/client'
import { Popup } from './Popup'

createRoot(document.getElementById('root')!).render(<Popup />)
```
(기존 엔트리의 import/마운트 방식이 다르면 그 방식에 맞춰 `Popup`만 갈아끼운다.)

- [ ] **Step 4: 타입체크 + 빌드**

Run: `pnpm typecheck && pnpm build`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/popup
git commit -m "feat: 팝업 UI - 추출 버튼 및 결과 표시"
```

---

## Task 8: 통합 수동 검증 (성공 기준 충족 확인)

**Files:** 없음 (수동 E2E)

- [ ] **Step 1: 확장 재로드 후 E2E**

1. `pnpm build` → `chrome://extensions`에서 확장 새로고침
2. melon.com 로그인 상태에서 임의 페이지 → 툴바 팝업 열기 → "내 플레이리스트 전체 추출" 클릭
3. 확인:
   - [ ] 내 플레이리스트 N개가 목록으로 표시됨
   - [ ] 각 항목 펼치면 수록곡(곡명 — 아티스트) 표시됨
   - [ ] 비로그인 상태/다른 사이트 탭에서는 안내 메시지 표시됨

- [ ] **Step 2: 전체 테스트 + 타입체크 최종 확인**

Run: `pnpm test && pnpm typecheck`
Expected: 전부 PASS.

- [ ] **Step 3: 검증 결과를 설계 문서에 반영**

`docs/superpowers/specs/2026-06-03-melon-playlist-extractor-design.md`의 "내 플레이리스트 목록 enumerate" 행을 실제 검증 결과(확정된 LIST_URL, 페이징 여부)로 업데이트하고 커밋:
```bash
git add docs/superpowers/specs/2026-06-03-melon-playlist-extractor-design.md
git commit -m "docs: 목록 엔드포인트 검증 결과 반영"
```
