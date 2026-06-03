export interface Song {
  songId: string
  trackNo: number
  title: string
  artist: string
  album: string
  artistIds?: string
  albumId?: string
  likes?: string
  songUrl?: string
}

export interface Playlist {
  seq: string
  title: string
  songCount: number
  songs: Song[]
}

export interface ExtractResult {
  playlists: Playlist[]
  extractedAt: string
}

export interface MelonTrackRequest {
  playlist_id: string
  position: number
  melon_song_id: string
  title: string
  artists_text: string
  melon_artist_ids: string
  album_title: string
  melon_album_id: string
  melon_likes: number
  melon_song_url: string
}

/** preview 응답: 멜론 곡 1개에 매칭된 Spotify 후보 트랙 */
export interface SpotifyTrack {
  id: string
  name: string
  duration_ms: number
  explicit: boolean
  popularity?: number
  artists: { id: string; name: string }[]
  album: {
    id: string
    name: string
    release_date?: string
    images?: { url: string; height: number; width: number }[]
  }
}

/** preview 응답 1행: 요청 곡 정보 + Spotify 후보 목록(상위 N개) */
export interface MelonTrackResult extends MelonTrackRequest {
  results: SpotifyTrack[]
}

/** Spotify 플레이리스트 내보내기 요청 본문 */
export interface SpotifyExportRequest {
  playlist_name: string
  track_ids: string[]
}

export interface ExportToSpotifyRequest {
  type: 'EXPORT_TO_SPOTIFY'
  payload: SpotifyExportRequest
}

export type ExportToSpotifyResponse =
  | { ok: true }
  | { ok: false; error: string }

export type MelonSessionStatus =
  | 'LOGGED_IN'
  | 'LOGGED_OUT'
  | 'PLAYLIST_IDS_NOT_FOUND'
  | 'UNKNOWN'

export interface MelonSessionResult {
  status: MelonSessionStatus
  playlistCount?: number
  error?: string
}

/** 팝업 → 콘텐츠 스크립트 */
export interface CheckMelonSessionRequest {
  type: 'CHECK_MELON_SESSION'
  /** 팝업이 chrome.cookies(MLCP)에서 확보한 memberKey. 페이지 무관하게 본인 목록 조회에 사용 */
  memberKey?: string
}

export interface ExtractAllRequest {
  type: 'EXTRACT_ALL'
  memberKey?: string
}

export type ContentRequest = CheckMelonSessionRequest | ExtractAllRequest

/** 콘텐츠 스크립트 → 팝업 */
export type CheckMelonSessionResponse =
  | { ok: true; result: MelonSessionResult }
  | { ok: false; error: string }

export type ExtractAllResponse =
  | { ok: true; result: ExtractResult }
  | { ok: false; error: string }
