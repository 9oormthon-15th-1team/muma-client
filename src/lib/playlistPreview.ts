import type { MelonTrackResult, Playlist, SpotifyExportRequest } from './types'

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

export function spotifySelectionKey(playlistId: string, melonSongId: string): string {
  return `${playlistId}:${melonSongId}`
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
