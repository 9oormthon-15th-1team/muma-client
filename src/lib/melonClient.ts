import { parseSongList, parsePlaylistSeqs } from './melonParser'
import type { ExtractResult, Playlist } from './types'

const FALLBACK_LIST_URL = '/mymusic/playlist/mymusicplaylist_list.htm'
const MAIN_LIST_PATH = '/mymusic/main/mymusicmain_list.htm'

const EXCEPTION_MARK = 'mymusiccommon_exception'
const PREVIEW_LENGTH = 160

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function getPlaylistListUrlCandidates(): string[] {
  const params = new URLSearchParams(location.search)
  const memberKeyFromUrl = params.get('memberKey')
  const memberKeyFromHtml = document.documentElement.outerHTML.match(/memberKey=(\d+)/)?.[1]
  const memberKey = memberKeyFromUrl ?? memberKeyFromHtml
  const currentPath = `${location.pathname}${location.search}`
  const memberListUrl = memberKey ? `${MAIN_LIST_PATH}?memberKey=${memberKey}` : ''

  return unique([
    location.pathname === MAIN_LIST_PATH ? currentPath : '',
    memberListUrl,
    FALLBACK_LIST_URL,
  ])
}

async function fetchText(url: string, referrer?: string): Promise<string> {
  console.info('[muma] fetch:start', { url, referrer })
  const res = await fetch(url, {
    credentials: 'include',
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

export async function extractAll(playlistSeq?: string): Promise<ExtractResult> {
  const refs = playlistSeq
    ? [{ seq: playlistSeq, title: playlistSeq }]
    : parsePlaylistSeqs(await fetchPlaylistListHtml())

  console.info('[muma] playlist:list:parsed', {
    count: refs.length,
    refs: refs.slice(0, 5),
    source: playlistSeq ? 'manual-seq' : 'list-page',
  })
  if (refs.length === 0) {
    throw new Error(
      `PLAYLIST_LIST_EMPTY: 현재 페이지/목록 응답에서 plylstSeq를 찾지 못했습니다. 콘솔에서 확인한 plylstSeq를 입력해 단일 플레이리스트 추출을 시도하세요.`,
    )
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
