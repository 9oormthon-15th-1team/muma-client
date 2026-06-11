import type {
  ExportToSpotifyRequest,
  ExportToSpotifyResponse,
  SpotifyExportRequest,
  SpotifyLoginRequest,
  SpotifyLogoutRequest,
  SpotifyLogoutResponse,
  SpotifyStatusRequest,
  SpotifyStatusResponse,
  SpotifyTokenResponse,
} from '../lib/types'

// 팝업 → 백그라운드 메시지 어댑터.
// 요청/응답 와이어 포맷은 lib/types.ts의 BackgroundRequest·*Response 선언이 단일 출처다.
export function getSpotifyStatus(): Promise<SpotifyStatusResponse> {
  const request: SpotifyStatusRequest = { type: 'SPOTIFY_STATUS' }
  return chrome.runtime.sendMessage(request)
}

export function spotifyLogin(): Promise<SpotifyTokenResponse> {
  const request: SpotifyLoginRequest = { type: 'SPOTIFY_LOGIN' }
  return chrome.runtime.sendMessage(request)
}

export function spotifyLogout(): Promise<SpotifyLogoutResponse> {
  const request: SpotifyLogoutRequest = { type: 'SPOTIFY_LOGOUT' }
  return chrome.runtime.sendMessage(request)
}

export function requestSpotifyExport(
  payload: SpotifyExportRequest,
): Promise<ExportToSpotifyResponse> {
  const request: ExportToSpotifyRequest = { type: 'EXPORT_TO_SPOTIFY', payload }
  return chrome.runtime.sendMessage(request)
}
