import type {
  ExtractResult,
  MelonTrackRequest,
  MelonTrackResult,
  SpotifyExportRequest,
} from './types'
import {
  exportToSpotify as requestSpotifyExport,
  previewMelonTracks,
} from '../api/client'

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

export async function uploadMelonTracks(tracks: MelonTrackRequest[]): Promise<MelonTrackResult[]> {
  const response = await previewMelonTracks(tracks)
  return response.data ?? []
}

export async function exportToSpotify(
  spotifyToken: string,
  payload: SpotifyExportRequest,
): Promise<void> {
  await requestSpotifyExport(spotifyToken, payload)
}
