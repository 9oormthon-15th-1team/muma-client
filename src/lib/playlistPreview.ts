import type {
  ExtractResult,
  MelonTrackRequest,
  MelonTrackResult,
  Playlist,
  SpotifyExportRequest,
} from './types'

export interface PlaylistPreviewGroup {
  playlist: Playlist
  rows: MelonTrackResult[]
}

export interface PlaylistExportJob {
  playlistSeq: string
  payload: SpotifyExportRequest
}

export type PlaylistExportStatus =
  | { status: 'idle' }
  | { status: 'exporting' }
  | { status: 'success'; exportedCount: number }
  | { status: 'error'; error: string }
  | { status: 'skipped'; reason: string }

export type PlaylistExportStatusMap = Record<string, PlaylistExportStatus>

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

// 추출 결과를 서버 매칭(preview) 요청 행으로 평탄화한다.
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

export function spotifySelectionKey(playlistId: string, melonSongId: string): string {
  return `${playlistId}:${melonSongId}`
}

// 추출 곡 선택 키: 같은 곡이 여러 플레이리스트에 있을 수 있어 플레이리스트 스코프로 구분한다.
export function songSelectionKey(playlistSeq: string, songId: string): string {
  return `${playlistSeq}:${songId}`
}

export function groupPreviewByPlaylist(
  playlists: Playlist[],
  preview: MelonTrackResult[],
): PlaylistPreviewGroup[] {
  const rowsByPlaylist = new Map<string, MelonTrackResult[]>()

  for (const row of preview) {
    const rows = rowsByPlaylist.get(row.playlist_id) ?? []
    rows.push(row)
    rowsByPlaylist.set(row.playlist_id, rows)
  }

  return playlists
    .map((playlist) => ({
      playlist,
      rows: [...(rowsByPlaylist.get(playlist.seq) ?? [])].sort(
        (a, b) => a.position - b.position,
      ),
    }))
    .filter((group) => group.rows.length > 0)
}

export function buildExportTrackIds(
  rows: MelonTrackResult[],
  selected: Record<string, string>,
): string[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row) =>
      row.results.length === 1
        ? row.results[0].id
        : selected[spotifySelectionKey(row.playlist_id, row.melon_song_id)],
    )
    .filter((id): id is string => Boolean(id))
}

export function buildPlaylistExportJobs(
  groups: PlaylistPreviewGroup[],
  selected: Record<string, string>,
): PlaylistExportJob[] {
  return groups
    .map((group) => ({
      playlistSeq: group.playlist.seq,
      payload: {
        playlist_name: group.playlist.title.trim() || `Melon Playlist ${group.playlist.seq}`,
        track_ids: buildExportTrackIds(group.rows, selected),
      },
    }))
    .filter((job) => job.payload.track_ids.length > 0)
}
