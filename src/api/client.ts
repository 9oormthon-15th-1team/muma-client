const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

interface ApiResponse<T = void> {
  meta: { code: string; message?: string }
  data?: T
}

async function request<T>(
  path: string,
  options: RequestInit & { spotifyToken?: string } = {},
): Promise<ApiResponse<T>> {
  const { spotifyToken, headers: customHeaders, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  }

  if (spotifyToken) {
    headers['X-Muma-Spotify-Token'] = spotifyToken
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error ${response.status}: ${text}`)
  }

  return response.json()
}

// --- Melon ---

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

export interface SpotifyTrack {
  id: string
  name: string
  duration_ms: number
  explicit: boolean
  popularity?: number
  artists: { id: string; name: string }[]
  album: { id: string; name: string; release_date: string }
}

export interface MelonTrackResult extends MelonTrackRequest {
  results: SpotifyTrack[]
}

export function previewMelonTracks(tracks: MelonTrackRequest[]) {
  return request<MelonTrackResult[]>('/api/melon/preview', {
    method: 'POST',
    body: JSON.stringify(tracks),
  })
}

// --- Spotify Export ---

export interface SpotifyExportRequest {
  playlist_name: string
  track_ids: string[]
}

export function exportToSpotify(spotifyToken: string, data: SpotifyExportRequest) {
  return request('/api/spotify/export', {
    method: 'POST',
    spotifyToken,
    body: JSON.stringify(data),
  })
}
