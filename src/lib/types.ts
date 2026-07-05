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

/** 이전 대상 플랫폼 */
export type TargetPlatform = 'spotify' | 'ytmusic'

/**
 * preview 응답: 멜론 곡 1개에 매칭된 대상 플랫폼 후보 트랙.
 * Spotify/YouTube preview가 같은 필드명을 쓴다 — YouTube는 id=videoId, artists=[{name: 채널/아티스트명}].
 */
export interface TrackCandidate {
  id: string
  name: string
  duration_ms?: number
  explicit?: boolean
  popularity?: number
  artists: { id: string; name: string }[]
  album?: {
    id: string
    name: string
    release_date?: string
    images?: { url: string; height: number; width: number }[]
  }
  thumbnail_url?: string
}

/** preview 응답 1행: 요청 곡 정보 + 대상 플랫폼 후보 목록(상위 N개) */
export interface MelonTrackResult extends MelonTrackRequest {
  results: TrackCandidate[]
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

/** YouTube 플레이리스트 내보내기 요청 본문 */
export interface YoutubeExportRequest {
  playlist_name: string
  video_ids: string[]
}

export interface ExportToYoutubeRequest {
  type: 'EXPORT_TO_YOUTUBE'
  payload: YoutubeExportRequest
}

export type ExportToYoutubeResponse =
  | { ok: true }
  | { ok: false; error: string }

/** 팝업 → 백그라운드. 응답 스키마는 아래 *Response 타입이 단일 출처다. */
export interface PingRequest {
  type: 'PING'
}

export interface SpotifyLoginRequest {
  type: 'SPOTIFY_LOGIN'
}

export interface SpotifyStatusRequest {
  type: 'SPOTIFY_STATUS'
}

export interface SpotifyLogoutRequest {
  type: 'SPOTIFY_LOGOUT'
}

export interface YoutubeLoginRequest {
  type: 'YOUTUBE_LOGIN'
}

export interface YoutubeStatusRequest {
  type: 'YOUTUBE_STATUS'
}

export interface YoutubeLogoutRequest {
  type: 'YOUTUBE_LOGOUT'
}

export type BackgroundRequest =
  | PingRequest
  | ExportToSpotifyRequest
  | SpotifyLoginRequest
  | SpotifyStatusRequest
  | SpotifyLogoutRequest
  | ExportToYoutubeRequest
  | YoutubeLoginRequest
  | YoutubeStatusRequest
  | YoutubeLogoutRequest

/** 백그라운드 → 팝업 */
export interface PongResponse {
  type: 'PONG'
  at: number
}

/** SPOTIFY_LOGIN 응답 */
export type SpotifyTokenResponse =
  | { success: true; accessToken: string }
  | { success: false; error?: string }

export interface SpotifyStatusResponse {
  loggedIn: boolean
}

export type SpotifyLogoutResponse =
  | { success: true }
  | { success: false; error?: string }

/** YOUTUBE_LOGIN 응답 */
export type YoutubeTokenResponse =
  | { success: true; accessToken: string }
  | { success: false; error?: string }

export interface YoutubeStatusResponse {
  loggedIn: boolean
}

export type YoutubeLogoutResponse =
  | { success: true }
  | { success: false; error?: string }

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
