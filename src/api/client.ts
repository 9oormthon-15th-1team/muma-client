import type {
  MelonTrackRequest,
  MelonTrackResult,
  SpotifyExportRequest,
} from '../lib/types'

export interface ApiResponse<T = void> {
  meta: { code: string; message?: string }
  data?: T
}

function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  return baseUrl.replace(/\/$/, '')
}

async function request<T>(
  path: string,
  options: RequestInit & { spotifyToken?: string } = {},
): Promise<ApiResponse<T>> {
  const { spotifyToken, headers: customHeaders, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  }

  if (spotifyToken) {
    headers['X-Muma-Spotify-Token'] = spotifyToken
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error ${response.status}: ${text}`)
  }

  return response.json()
}

export function previewMelonTracks(tracks: MelonTrackRequest[]) {
  return request<MelonTrackResult[]>('/api/melon/preview', {
    method: 'POST',
    body: JSON.stringify(tracks),
  })
}

export function exportToSpotify(spotifyToken: string, data: SpotifyExportRequest) {
  return request('/api/spotify/export', {
    method: 'POST',
    spotifyToken,
    body: JSON.stringify(data),
  })
}
