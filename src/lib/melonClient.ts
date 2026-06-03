import { parseSongList, parsePlaylistSeqs } from './melonParser'
import type { ExtractResult, MelonSessionResult, MelonSessionStatus, Playlist } from './types'

const PLAYLIST_LIST_PATH = '/mymusic/playlist/mymusicplaylist_list.htm'

const EXCEPTION_MARK = 'mymusiccommon_exception'
const PREVIEW_LENGTH = 160
// 멜론 로그인 페이지(accounts.melon.com)에만 나타나는 신호. 로그인된 목록/홈 페이지엔
// 등장하지 않으므로(오탐 없음) 세션 URL이 로그인 페이지로 이동했는지 판별에 사용.
const LOGIN_MARKERS = ['login_form', 'member-login', '카카오계정 로그인', 'accounts.melon.com']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function getCookieValue(name: string): string {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/**
 * 로그인한 사용자의 memberKey를 멜론 `MLCP` 쿠키에서 추출한다.
 * 멜론 자신이 로그인 판별(isMelonLogin)에 쓰는 신호와 동일하며, 쿠키이므로
 * 메인/마이뮤직 등 어떤 멜론 페이지에서도 동일하게 동작한다(페이지 HTML 의존 없음).
 *
 * MLCP = Base64( "memberKey;memberId;memberDjYn;...;cookieLoginType" ). 표준 base64라 atob로 디코드.
 * 로그인하지 않았으면 MLCP 쿠키가 없으므로 null.
 */
export function getMemberKeyFromCookie(): string | null {
  const raw = getCookieValue('MLCP')
  if (!raw) return null
  try {
    const base64 = raw.replace(/[^A-Za-z0-9+/=]/g, '')
    const memberKey = atob(base64).split(';')[0]?.trim()
    return memberKey && /^\d+$/.test(memberKey) ? memberKey : null
  } catch {
    return null
  }
}

function getPlaylistListUrlCandidates(): string[] {
  const memberKey =
    getMemberKeyFromCookie() ?? // 공용 신호: 어떤 페이지에서도 동작
    new URLSearchParams(location.search).get('memberKey') ??
    document.documentElement.outerHTML.match(/memberKey=(\d+)/)?.[1] ??
    undefined
  const currentPath = `${location.pathname}${location.search}`

  return unique([
    // 이미 플레이리스트 목록 페이지면 그 URL 그대로 사용
    location.pathname === PLAYLIST_LIST_PATH ? currentPath : '',
    // 검출한 memberKey로 본인 목록 조회 (확인된 동작 URL)
    memberKey ? `${PLAYLIST_LIST_PATH}?memberKey=${memberKey}` : '',
    // memberKey 미검출 시 로그인 세션 기반 본인 목록
    PLAYLIST_LIST_PATH,
  ])
}

async function fetchText(url: string, referrer?: string): Promise<string> {
  console.info('[muma] fetch:start', { url, referrer })
  const res = await fetch(url, {
    credentials: 'include',
    cache: 'no-store', // 로그아웃/재로그인이 즉시 반영되도록 캐시 사용 금지
    ...(referrer ? { referrer } : {}),
  })
  console.info('[muma] fetch:response', {
    url,
    finalUrl: res.url,
    status: res.status,
    ok: res.ok,
  })
  if (!res.ok) throw new Error(`요청 실패: ${url} (HTTP ${res.status}, finalUrl=${res.url})`)
  // 비로그인 시 예외 페이지로 리다이렉트되는지 최종 URL로 감지
  if (res.url.includes(EXCEPTION_MARK)) {
    throw new Error('NOT_LOGGED_IN')
  }
  const html = await res.text()
  console.info('[muma] fetch:html', {
    url,
    finalUrl: res.url,
    length: html.length,
    preview: html.replace(/\s+/g, ' ').slice(0, PREVIEW_LENGTH),
  })
  if (html.includes(EXCEPTION_MARK)) {
    throw new Error('NOT_LOGGED_IN')
  }
  return html
}

async function fetchTextRaw(url: string): Promise<{ finalUrl: string; html: string; ok: boolean; status: number }> {
  console.info('[muma] fetch:raw:start', { url })
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
  const html = await res.text()
  console.info('[muma] fetch:raw:response', {
    url,
    finalUrl: res.url,
    status: res.status,
    ok: res.ok,
    length: html.length,
    preview: html.replace(/\s+/g, ' ').slice(0, PREVIEW_LENGTH),
  })
  return { finalUrl: res.url, html, ok: res.ok, status: res.status }
}

export function classifyMelonSessionHtml(finalUrl: string, html: string): MelonSessionStatus {
  // 비로그인: 세션 URL이 예외 페이지로 리다이렉트되거나 멜론 로그인 페이지로 이동.
  // 참고: 멜론은 비로그인 사용자에게도 returnType=NOTEXIST + "탈퇴한 회원입니다." 문구를
  // 내려주므로, 그 문구로는 실제 탈퇴 여부를 구분할 수 없다 → 모두 LOGGED_OUT로 처리.
  if (finalUrl.includes(EXCEPTION_MARK) || html.includes(EXCEPTION_MARK)) return 'LOGGED_OUT'
  if (LOGIN_MARKERS.some((marker) => finalUrl.includes(marker) || html.includes(marker))) {
    return 'LOGGED_OUT'
  }
  return 'LOGGED_IN'
}

export async function fetchPlaylistListHtml(): Promise<string> {
  const candidates = getPlaylistListUrlCandidates()
  console.info('[muma] playlist:list:candidates', {
    href: location.href,
    candidates,
  })

  let lastError: unknown
  for (const url of candidates) {
    try {
      return await fetchText(url)
    } catch (err) {
      lastError = err
      console.warn('[muma] playlist:list:candidate failed', { url, err })
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function checkMelonSession(): Promise<MelonSessionResult> {
  // 로그인 신호를 여러 경로로 시도한다(견고성):
  //  1) MLCP 쿠키의 memberKey → 메인 등 어떤 페이지에서도 동작 (1순위, getPlaylistListUrlCandidates 내부)
  //  2) 현재 페이지/URL의 memberKey (마이뮤직 페이지)
  //  3) bare 세션 URL → 로그아웃이면 예외 페이지로 리다이렉트
  // 쿠키 디코드가 실패해도 2)·3)으로 폴백되어 로그인 검증이 사라지지 않는다.
  const candidates = getPlaylistListUrlCandidates()
  console.info('[muma] session:candidates', {
    href: location.href,
    cookieMemberKey: getMemberKeyFromCookie(),
    candidates,
  })

  let lastError = ''
  for (const url of candidates) {
    try {
      const { finalUrl, html, ok, status } = await fetchTextRaw(url)
      if (!ok) {
        lastError = `HTTP ${status}`
        continue
      }
      if (classifyMelonSessionHtml(finalUrl, html) === 'LOGGED_OUT') {
        return { status: 'LOGGED_OUT' }
      }
      const refs = parsePlaylistSeqs(html)
      if (refs.length === 0) {
        return { status: 'PLAYLIST_IDS_NOT_FOUND', playlistCount: 0 }
      }
      return { status: 'LOGGED_IN', playlistCount: refs.length }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.warn('[muma] session:candidate failed', { url, err })
    }
  }

  return { status: 'UNKNOWN', error: lastError || '세션 확인 실패' }
}

export async function fetchSongListHtml(seq: string): Promise<string> {
  const enc = encodeURIComponent(seq)
  const url = `/mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=${enc}`
  const referrer = `${location.origin}/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=${enc}`
  return fetchText(url, referrer)
}

export async function fetchPagedSongListHtml(seq: string, startIndex: number): Promise<string> {
  const enc = encodeURIComponent(seq)
  const url = `/mymusic/playlist/mymusicplaylistview_listPagingSong.htm?plylstSeq=${enc}&startIndex=${startIndex}&pageSize=50`
  const referrer = `${location.origin}/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=${enc}`
  return fetchText(url, referrer)
}

export async function fetchPlaylistSongs(seq: string) {
  const firstHtml = await fetchSongListHtml(seq)
  const songs = parseSongList(firstHtml)
  console.info('[muma] playlist:songs:page parsed', {
    seq,
    startIndex: 1,
    songCount: songs.length,
  })

  for (let startIndex = 51; ; startIndex += 50) {
    const html = await fetchPagedSongListHtml(seq, startIndex)
    const pageSongs = parseSongList(html)
    console.info('[muma] playlist:songs:page parsed', {
      seq,
      startIndex,
      songCount: pageSongs.length,
    })

    if (pageSongs.length === 0) break
    songs.push(...pageSongs)
    await sleep(200)
  }

  return songs
}

export async function extractAll(): Promise<ExtractResult> {
  const refs = parsePlaylistSeqs(await fetchPlaylistListHtml())

  console.info('[muma] playlist:list:parsed', {
    count: refs.length,
    refs: refs.slice(0, 5),
  })
  if (refs.length === 0) {
    throw new Error('PLAYLIST_IDS_NOT_FOUND')
  }
  const playlists: Playlist[] = []
  for (const ref of refs) {
    const songs = await fetchPlaylistSongs(ref.seq)
    console.info('[muma] playlist:songs:parsed', {
      seq: ref.seq,
      title: ref.title,
      songCount: songs.length,
    })
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
