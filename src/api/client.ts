import type {
  MelonTrackRequest,
  MelonTrackResult,
  SpotifyExportRequest,
} from '../lib/types'

interface ApiResponse<T = void> {
  meta: { code: string; message?: string }
  data?: T
}

// 가드레일: 병렬로 호출되는 /preview·/export 요청이 브라우저/서버를 한꺼번에 때리지 않도록
// 동시 in-flight 요청 수를 제한하고, 응답이 없을 때 무한 대기하지 않도록 타임아웃을 건다.
const MAX_CONCURRENT_REQUESTS = 4
const REQUEST_TIMEOUT_MS = 15000

let activeRequests = 0
const waiters: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      activeRequests += 1
      resolve()
    })
  })
}

function releaseSlot(): void {
  activeRequests -= 1
  waiters.shift()?.()
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

  // 슬롯을 먼저 확보한 뒤 타임아웃을 시작한다 — 대기 큐에서 머문 시간은 타임아웃에 포함하지 않는다.
  await acquireSlot()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API error ${response.status}: ${text}`)
    }

    return await response.json()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`API timeout: ${path} (${REQUEST_TIMEOUT_MS}ms 초과)`)
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
    releaseSlot()
  }
}

export async function previewMelonTracks(
  tracks: MelonTrackRequest[],
): Promise<MelonTrackResult[]> {
  const response = await request<MelonTrackResult[]>('/api/melon/preview', {
    method: 'POST',
    body: JSON.stringify(tracks),
  })
  return response.data ?? []
}

export async function exportToSpotify(
  spotifyToken: string,
  data: SpotifyExportRequest,
): Promise<void> {
  await request('/api/spotify/export', {
    method: 'POST',
    spotifyToken,
    body: JSON.stringify(data),
  })
}
