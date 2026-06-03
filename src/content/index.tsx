import { extractAll } from '../lib/melonClient'
import type { ExtractAllRequest, ExtractAllResponse } from '../lib/types'

chrome.runtime.onMessage.addListener(
  (msg: ExtractAllRequest, _sender, sendResponse: (r: ExtractAllResponse) => void) => {
    if (msg?.type !== 'EXTRACT_ALL') return
    extractAll()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        sendResponse({ ok: false, error: message })
      })
    return true // 비동기 응답을 위해 채널 유지
  },
)
