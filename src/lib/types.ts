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

export interface UploadMelonTracksRequest {
  type: 'UPLOAD_MELON_TRACKS'
  tracks: MelonTrackRequest[]
}

export type UploadMelonTracksResponse =
  | { ok: true; result: unknown }
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
