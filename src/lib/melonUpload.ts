import type { ExtractResult, MelonTrackRequest } from './types'

export const MELON_PREVIEW_API_URL = 'http://192.168.0.22:8080/api/melon/preview'

function parseLikes(value: string | undefined): number {
  const parsed = Number((value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeArtistsText(value: string): string {
  return value
    .split(/[;,]/)
    .map((artist) => artist.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')
}

export function mapExtractResultToMelonTracks(result: ExtractResult): MelonTrackRequest[] {
  return result.playlists.flatMap((playlist) =>
    playlist.songs.map((song) => ({
      playlist_id: playlist.seq,
      position: song.trackNo,
      melon_song_id: song.songId,
      title: song.title,
      artists_text: normalizeArtistsText(song.artist),
      melon_artist_ids: song.artistIds ?? '',
      album_title: song.album,
      melon_album_id: song.albumId ?? '',
      melon_likes: parseLikes(song.likes),
      melon_song_url: song.songUrl ?? `https://www.melon.com/song/detail.htm?songId=${song.songId}`,
    })),
  )
}

export async function uploadMelonTracks(tracks: MelonTrackRequest[]): Promise<unknown> {
  const res = await fetch(MELON_PREVIEW_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tracks),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`업로드 실패: HTTP ${res.status} ${text}`.trim())
  }

  return res.json()
}
