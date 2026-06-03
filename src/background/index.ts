// 백그라운드 서비스 워커 (Manifest V3).
// 확장 프로그램의 이벤트 허브 역할을 합니다. DOM 접근은 불가하며,
// 메시지 라우팅 · 알람 · 스토리지 동기화 등 백그라운드 로직을 담당합니다.
import { uploadMelonTracks } from '../lib/melonUpload'
import type { UploadMelonTracksRequest, UploadMelonTracksResponse } from '../lib/types'

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[muma] 설치/업데이트:', details.reason)
  // 최초 설치 시 기본값 세팅
  if (details.reason === 'install') {
    chrome.storage.local.set({ count: 0 })
  }
})

// 콘텐츠 스크립트 ↔ 팝업 간 메시지 중계 예제
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

  // 비동기 응답을 쓰려면 true를 반환
  return true
})

export {}
