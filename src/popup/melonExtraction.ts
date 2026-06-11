import type { ExtractAllRequest, ExtractAllResponse, ExtractResult } from '../lib/types'

// 멜론 추출 오케스트레이션: 멜론 데이터는 멜론 도메인(content script)에서만 접근
// 가능하므로, 백그라운드 탭을 열어 추출하고 탭을 정리하는 과정 전체를 숨긴다.
// 실패는 throw 대신 선언된 에러 코드로 반환한다.

const MELON_PLAYLIST_LIST_URL = 'https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm'

// 멜론 실제 로그인 페이지(accounts.melon.com). 로그인 후 플레이리스트 목록으로 복귀시켜
// 콘텐츠 스크립트가 해당 탭에서 동작하도록 한다.
const MELON_LOGIN_TARGET =
  'https://accounts.melon.com/login/login.htm?redirectURL=' +
  encodeURIComponent(MELON_PLAYLIST_LIST_URL)

export async function openMelonLogin(active?: boolean): Promise<void> {
  await chrome.tabs.create(
    active === undefined
      ? { url: MELON_LOGIN_TARGET }
      : { url: MELON_LOGIN_TARGET, active },
  )
}

export async function openMyMusicPlaylists(memberKey: string | null): Promise<void> {
  const url = memberKey
    ? `${MELON_PLAYLIST_LIST_URL}?memberKey=${memberKey}`
    : MELON_PLAYLIST_LIST_URL
  await chrome.tabs.create({ url })
}

export type MelonExtractionOutcome =
  | { ok: true; result: ExtractResult }
  | { ok: false; code: MelonExtractionErrorCode; message?: string }

export type MelonExtractionErrorCode =
  /** 백그라운드 탭을 만들지 못함 */
  | 'TAB_OPEN_FAILED'
  /** 재시도 한도까지 콘텐츠 스크립트가 응답하지 않음 */
  | 'PAGE_LOAD_FAILED'
  /** 멜론 비로그인 상태 */
  | 'NOT_LOGGED_IN'
  /** 플레이리스트 목록을 찾지 못함 */
  | 'PLAYLIST_NOT_FOUND'
  /** 콘텐츠 스크립트가 보고한 그 외 오류 (message에 원문) */
  | 'CONTENT_ERROR'
  /** 예기치 못한 예외 (message에 원문) */
  | 'UNKNOWN'

const CONTENT_NOT_READY = 'Receiving end does not exist'
const RETRY_DELAY_MS = 400
const MAX_ATTEMPTS = 25 // 약 10초

// 새 탭은 document_idle 시점에 콘텐츠 스크립트가 붙으므로,
// 주입이 끝날 때까지 재시도하며 추출을 요청한다.
async function requestExtract(tabId: number, memberKey: string): Promise<ExtractAllResponse> {
  const request: ExtractAllRequest = { type: 'EXTRACT_ALL', memberKey }
  for (let attempt = 0; ; attempt++) {
    try {
      return (await chrome.tabs.sendMessage(tabId, request)) as ExtractAllResponse
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes(CONTENT_NOT_READY) || attempt >= MAX_ATTEMPTS) throw e
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }
  }
}

export async function extractFromMelon(memberKey: string): Promise<MelonExtractionOutcome> {
  let tabId: number | undefined
  try {
    const created = await chrome.tabs.create({
      url: `${MELON_PLAYLIST_LIST_URL}?memberKey=${memberKey}`,
      active: false,
    })
    tabId = created.id
  } catch (e) {
    return { ok: false, code: 'TAB_OPEN_FAILED', message: e instanceof Error ? e.message : String(e) }
  }
  if (tabId == null) {
    return { ok: false, code: 'TAB_OPEN_FAILED' }
  }

  try {
    const res = await requestExtract(tabId, memberKey)
    if (res.ok) return { ok: true, result: res.result }
    if (res.error === 'NOT_LOGGED_IN') return { ok: false, code: 'NOT_LOGGED_IN' }
    if (res.error === 'PLAYLIST_IDS_NOT_FOUND' || res.error === 'PLAYLIST_LIST_EMPTY') {
      return { ok: false, code: 'PLAYLIST_NOT_FOUND' }
    }
    return { ok: false, code: 'CONTENT_ERROR', message: res.error }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes(CONTENT_NOT_READY)) {
      return { ok: false, code: 'PAGE_LOAD_FAILED' }
    }
    return { ok: false, code: 'UNKNOWN', message }
  } finally {
    // 추출용으로 연 백그라운드 탭은 정리한다.
    void chrome.tabs.remove(tabId).catch(() => {})
  }
}
