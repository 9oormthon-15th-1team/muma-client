import { uploadMelonTracks } from '../lib/melonUpload'
import type { UploadMelonTracksRequest, UploadMelonTracksResponse } from '../lib/types'
import { login, getStoredTokens, clearTokens, getValidAccessToken } from '../spotify/auth'

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[muma] 설치/업데이트:', details.reason)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[background] message received:', message)

  if (message?.type === 'PING') {
    sendResponse({ type: 'PONG', at: Date.now() })
    return true
  }

  if (message?.type === 'UPLOAD_MELON_TRACKS') {
    const { tracks } = message as UploadMelonTracksRequest
    console.info('[muma] upload:payload', {
      count: tracks.length,
      preview: tracks.slice(0, 5),
      tracks,
    })
    uploadMelonTracks(tracks)
      .then((result) => {
        console.info('[muma] upload:success', result)
        const response: UploadMelonTracksResponse = { ok: true, result }
        sendResponse(response)
      })
      .catch((err: unknown) => {
        console.error('[muma] upload:failed', err)
        const response: UploadMelonTracksResponse = {
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
        sendResponse({ success: true, accessToken: tokens.accessToken })
      })
      .catch((err: Error) => {
        console.error('[background] login error:', err)
        sendResponse({ success: false, error: err.message })
      })
    return true
  }

  if (message?.type === 'SPOTIFY_GET_TOKEN') {
    getValidAccessToken()
      .then((accessToken) => sendResponse({ success: true, accessToken }))
      .catch((err: Error) => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message?.type === 'SPOTIFY_STATUS') {
    getStoredTokens()
      .then((tokens) => sendResponse({ loggedIn: tokens !== null }))
      .catch(() => sendResponse({ loggedIn: false }))
    return true
  }

  if (message?.type === 'SPOTIFY_LOGOUT') {
    clearTokens()
      .then(() => sendResponse({ success: true }))
      .catch((err: Error) => sendResponse({ success: false, error: err.message }))
    return true
  }

  return true
})

export {}
