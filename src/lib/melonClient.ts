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
  const enc = encodeURIComponent(seq)
  const url = `/mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=${enc}`
  const referrer = `${location.origin}/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=${enc}`
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
