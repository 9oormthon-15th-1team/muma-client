import { exportToSpotify, exportToYoutube } from '../api/client'
import type {
  BackgroundRequest,
  ExportToSpotifyResponse,
  ExportToYoutubeResponse,
  PongResponse,
  SpotifyLogoutResponse,
  SpotifyStatusResponse,
  SpotifyTokenResponse,
  YoutubeLogoutResponse,
  YoutubeStatusResponse,
  YoutubeTokenResponse,
} from '../lib/types'
import { login, getStoredTokens, clearTokens, getValidAccessToken } from '../spotify/auth'
import {
  login as youtubeLogin,
  getStoredTokens as getStoredYoutubeTokens,
  clearTokens as clearYoutubeTokens,
  getValidAccessToken as getValidYoutubeAccessToken,
} from '../youtube/auth'

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[muma] 설치/업데이트:', details.reason)
})

// 요청/응답 와이어 포맷은 lib/types.ts의 BackgroundRequest·*Response 선언이 단일 출처다.
chrome.runtime.onMessage.addListener((message: BackgroundRequest, _sender, sendResponse) => {
  console.log('[background] message received:', message)

  if (message?.type === 'PING') {
    const response: PongResponse = { type: 'PONG', at: Date.now() }
    sendResponse(response)
    return true
  }

  if (message?.type === 'EXPORT_TO_SPOTIFY') {
    const { payload } = message
    getValidAccessToken()
      .then((token) => exportToSpotify(token, payload))
      .then(() => {
        console.info('[muma] export:success', payload.playlist_name)
        const response: ExportToSpotifyResponse = { ok: true }
        sendResponse(response)
      })
      .catch((err: unknown) => {
        console.error('[muma] export:failed', err)
        const response: ExportToSpotifyResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'SPOTIFY_LOGIN') {
    login()
      .then((tokens) => {
        console.log('[background] login success')
        const response: SpotifyTokenResponse = { success: true, accessToken: tokens.accessToken }
        sendResponse(response)
      })
      .catch((err: Error) => {
        console.error('[background] login error:', err)
        const response: SpotifyTokenResponse = { success: false, error: err.message }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'SPOTIFY_STATUS') {
    getStoredTokens()
      .then((tokens) => {
        const response: SpotifyStatusResponse = { loggedIn: tokens !== null }
        sendResponse(response)
      })
      .catch(() => {
        const response: SpotifyStatusResponse = { loggedIn: false }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'SPOTIFY_LOGOUT') {
    clearTokens()
      .then(() => {
        const response: SpotifyLogoutResponse = { success: true }
        sendResponse(response)
      })
      .catch((err: Error) => {
        const response: SpotifyLogoutResponse = { success: false, error: err.message }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'EXPORT_TO_YOUTUBE') {
    const { payload } = message
    getValidYoutubeAccessToken()
      .then((token) => exportToYoutube(token, payload))
      .then(() => {
        console.info('[muma] youtube export:success', payload.playlist_name)
        const response: ExportToYoutubeResponse = { ok: true }
        sendResponse(response)
      })
      .catch((err: unknown) => {
        console.error('[muma] youtube export:failed', err)
        const response: ExportToYoutubeResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'YOUTUBE_LOGIN') {
    youtubeLogin()
      .then((tokens) => {
        console.log('[background] youtube login success')
        const response: YoutubeTokenResponse = { success: true, accessToken: tokens.accessToken }
        sendResponse(response)
      })
      .catch((err: Error) => {
        console.error('[background] youtube login error:', err)
        const response: YoutubeTokenResponse = { success: false, error: err.message }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'YOUTUBE_STATUS') {
    getStoredYoutubeTokens()
      .then((tokens) => {
        const response: YoutubeStatusResponse = { loggedIn: tokens !== null }
        sendResponse(response)
      })
      .catch(() => {
        const response: YoutubeStatusResponse = { loggedIn: false }
        sendResponse(response)
      })
    return true
  }

  if (message?.type === 'YOUTUBE_LOGOUT') {
    clearYoutubeTokens()
      .then(() => {
        const response: YoutubeLogoutResponse = { success: true }
        sendResponse(response)
      })
      .catch((err: Error) => {
        const response: YoutubeLogoutResponse = { success: false, error: err.message }
        sendResponse(response)
      })
    return true
  }

  return true
})

export {}
