import { checkMelonSession, extractAll } from '../lib/melonClient'
import type {
  CheckMelonSessionResponse,
  ContentRequest,
  ExtractAllResponse,
} from '../lib/types'

chrome.runtime.onMessage.addListener(
  (
    msg: ContentRequest,
    _sender,
    sendResponse: (r: CheckMelonSessionResponse | ExtractAllResponse) => void,
  ) => {
    if (msg?.type === 'CHECK_MELON_SESSION') {
      console.info('[muma] CHECK_MELON_SESSION received', {
        href: location.href,
        readyState: document.readyState,
      })
      checkMelonSession()
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[muma] CHECK_MELON_SESSION failed', err)
          sendResponse({ ok: false, error: message })
        })
      return true
    }

    if (msg?.type !== 'EXTRACT_ALL') return
    console.info('[muma] EXTRACT_ALL received', {
      href: location.href,
      readyState: document.readyState,
    })
    extractAll()
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
