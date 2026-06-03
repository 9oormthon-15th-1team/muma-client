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

/** 팝업 → 콘텐츠 스크립트 */
export interface ExtractAllRequest {
  type: 'EXTRACT_ALL'
  playlistSeq?: string
}

/** 콘텐츠 스크립트 → 팝업 */
export type ExtractAllResponse =
  | { ok: true; result: ExtractResult }
  | { ok: false; error: string }
