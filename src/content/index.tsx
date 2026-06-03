import { extractAll } from '../lib/melonClient'
import type { ExtractAllRequest, ExtractAllResponse } from '../lib/types'

chrome.runtime.onMessage.addListener(
  (msg: ExtractAllRequest, _sender, sendResponse: (r: ExtractAllResponse) => void) => {
    if (msg?.type !== 'EXTRACT_ALL') return
    console.info('[muma] EXTRACT_ALL received', {
      href: location.href,
      readyState: document.readyState,
    })
    extractAll(msg.playlistSeq)
      .then((result) => {
        console.info('[muma] EXTRACT_ALL completed', {
          playlistCount: result.playlists.length,
        })
        sendResponse({ ok: true, result })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[muma] EXTRACT_ALL failed', err)
        sendResponse({ ok: false, error: message })
      })
    return true // 비동기 응답을 위해 채널 유지
  },
)
