import { useState } from 'react'
import type { ExtractAllResponse, ExtractResult } from '../lib/types'

export function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractResult | null>(null)

  async function handleExtract() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id || !tab.url?.includes('melon.com')) {
        setError('melon.com 탭에서 실행해주세요.')
        return
      }
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_ALL',
      })) as ExtractAllResponse
      if (res.ok) {
        setResult(res.result)
      } else {
        setError(
          res.error === 'NOT_LOGGED_IN'
            ? '멜론에 로그인 후 다시 시도해주세요.'
            : `추출 실패: ${res.error}`,
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ width: 360, padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 16, margin: '0 0 12px' }}>멜론 플레이리스트 추출</h1>
      <button onClick={handleExtract} disabled={loading}>
        {loading ? '추출 중…' : '내 플레이리스트 전체 추출'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <p>플레이리스트 {result.playlists.length}개</p>
          {result.playlists.map((pl) => (
            <details key={pl.seq} style={{ marginBottom: 8 }}>
              <summary>
                {pl.title} ({pl.songCount}곡)
              </summary>
              <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
                {pl.songs.map((s) => (
                  <li key={s.songId}>
                    {s.title} — {s.artist}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}
    </main>
  )
}
