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
