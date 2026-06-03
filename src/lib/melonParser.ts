import type { Song } from './types'

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseSongList(html: string): Song[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tbody tr'))
  const songs: Song[] = []
  for (const row of rows) {
    const cells = Array.from(row.children)
    if (cells.length < 5) continue

    const checkbox = row.querySelector('input[name="input_check"]') as HTMLInputElement | null
    if (!checkbox?.value) continue // 곡 행이 아님 (헤더 등)

    const songId = checkbox.value
    const trackNo = parseInt(text(cells[1]), 10) || 0
    const title =
      text(row.querySelector('a.btn_icon_detail span.odd_span')) ||
      text(cells[2].querySelector('a.fc_gray')) ||
      clean(checkbox.getAttribute('title')?.replace('곡 선택', ''))

    const artistLinks = Array.from(cells[3].querySelectorAll('a.fc_mgray'))
    const artist = artistLinks.length
      ? artistLinks.map((a) => text(a)).filter(Boolean).join('; ')
      : text(cells[3])
    const artistIds = artistLinks
      .map((a) => a.getAttribute('href')?.match(/goArtistDetail\('([^']+)'\)/)?.[1] ?? '')
      .filter(Boolean)
      .join(';')

    const albumEl = cells[4].querySelector('a.fc_mgray')
    const album = text(albumEl)
    const albumId = albumEl?.getAttribute('href')?.match(/goAlbumDetail\('([^']+)'\)/)?.[1] ?? ''
    const likes = text(row.querySelector('button.btn_icon.like span.cnt'))
      .replace('총건수', '')
      .replace(/,/g, '')

    songs.push({
      songId,
      trackNo,
      title,
      artist,
      album,
      artistIds,
      albumId,
      likes,
      songUrl: `https://www.melon.com/song/detail.htm?songId=${songId}`,
    })
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
    doc.querySelectorAll('a[href*="plylstSeq"]'),
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
  for (const match of html.matchAll(/plylstSeq\s*[=:]\s*['"]?(\d+)/g)) {
    const seq = match[1]
    if (seen.has(seq)) continue
    seen.add(seq)
    refs.push({ seq, title: seq })
  }
  return refs
}
