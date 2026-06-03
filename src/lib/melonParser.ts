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
