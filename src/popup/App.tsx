import { useEffect, useState } from 'react'
import type {
  CheckMelonSessionResponse,
  ExtractAllResponse,
  ExtractResult,
  MelonSessionResult,
  UploadMelonTracksResponse,
} from '../lib/types'
import { mapExtractResultToMelonTracks } from '../lib/melonUpload'

// 멜론 실제 로그인 페이지(accounts.melon.com). 로그인 후 플레이리스트 목록으로 복귀시켜
// 콘텐츠 스크립트가 해당 탭에서 동작하도록 한다.
const MELON_LOGIN_TARGET =
  'https://accounts.melon.com/login/login.htm?redirectURL=' +
  encodeURIComponent('https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm')

type PopupStatus = 'checking' | 'not_melon' | 'content_not_ready' | 'ready' | 'error'

export function App() {
  const [status, setStatus] = useState<PopupStatus>('checking')
  const [session, setSession] = useState<MelonSessionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSucceeded, setUploadSucceeded] = useState(false)
  const [result, setResult] = useState<ExtractResult | null>(null)

  async function getActiveMelonTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.includes('melon.com')) return null
    return tab
  }

  async function checkSession() {
    setStatus('checking')
    setError(null)
    setSession(null)
    try {
      const tab = await getActiveMelonTab()
      if (!tab?.id) {
        setStatus('not_melon')
        return
      }

      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: 'CHECK_MELON_SESSION',
      })) as CheckMelonSessionResponse

      if (res.ok) {
        setSession(res.result)
        setStatus('ready')
      } else {
        setError(res.error)
        setStatus('error')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus(msg.includes('Receiving end does not exist') ? 'content_not_ready' : 'error')
    }
  }

  useEffect(() => {
    void checkSession()
  }, [])

  async function handleExtract() {
    setLoading(true)
    setError(null)
    setUploadError(null)
    setUploadSucceeded(false)
    setResult(null)
    try {
      const tab = await getActiveMelonTab()
      if (!tab?.id) {
        setStatus('not_melon')
        setLoading(false)
        return
      }
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_ALL',
      })) as ExtractAllResponse
      if (res.ok) {
        setResult(res.result)
        setSession({ status: 'LOGGED_IN', playlistCount: res.result.playlists.length })
      } else if (res.error === 'NOT_LOGGED_IN') {
        setError('멜론에 로그인 후 다시 시도해주세요.')
        setSession({ status: 'LOGGED_OUT' })
      } else if (res.error === 'PLAYLIST_IDS_NOT_FOUND' || res.error === 'PLAYLIST_LIST_EMPTY') {
        setError('플레이리스트를 찾지 못했습니다. 멜론에 로그인한 계정인지 확인해주세요.')
        setSession({ status: 'PLAYLIST_IDS_NOT_FOUND', playlistCount: 0 })
      } else {
        setError(`추출 실패: ${res.error}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // 콘텐츠 스크립트가 주입되지 않은 탭(설치 전 열린 페이지 등)에서 발생
      setError(
        msg.includes('Receiving end does not exist')
          ? '멜론 플레이리스트 페이지를 새로고침한 뒤 다시 시도해주세요.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  async function openMelonLogin() {
    await chrome.tabs.create({ url: MELON_LOGIN_TARGET })
  }

  async function handleUpload() {
    if (!result) return
    setUploading(true)
    setUploadError(null)
    setUploadSucceeded(false)
    try {
      const tracks = mapExtractResultToMelonTracks(result)
      const res = (await chrome.runtime.sendMessage({
        type: 'UPLOAD_MELON_TRACKS',
        tracks,
      })) as UploadMelonTracksResponse

      if (res.ok) {
        setUploadSucceeded(true)
      } else {
        setUploadError(res.error)
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <main style={{ width: 360, padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 16, margin: '0 0 12px' }}>멜론 플레이리스트 추출</h1>

      {status === 'checking' && <p>멜론 로그인 상태 확인 중...</p>}

      {status === 'not_melon' && (
        <div>
          <p>멜론 페이지에서 실행해주세요.</p>
          <button onClick={openMelonLogin}>멜론 열기</button>
        </div>
      )}

      {status === 'content_not_ready' && (
        <div>
          <p>멜론 페이지를 새로고침한 뒤 다시 시도해주세요.</p>
          <button onClick={checkSession}>다시 확인</button>
        </div>
      )}

      {status === 'ready' && session?.status === 'LOGGED_OUT' && (
        <div>
          <p>멜론 로그인이 필요합니다.</p>
          <button onClick={openMelonLogin}>멜론 로그인하기</button>
          <button onClick={checkSession} style={{ marginLeft: 8 }}>
            다시 확인
          </button>
        </div>
      )}

      {status === 'ready' && session?.status === 'PLAYLIST_IDS_NOT_FOUND' && (
        <div>
          <p>로그인은 확인됐지만 플레이리스트 목록을 찾지 못했습니다.</p>
          <button onClick={checkSession}>다시 확인</button>
        </div>
      )}

      {status === 'ready' && session?.status === 'LOGGED_IN' && (
        <div>
          <p>플레이리스트 {session.playlistCount ?? 0}개를 찾았습니다.</p>
          <button onClick={handleExtract} disabled={loading}>
            {loading ? '추출 중...' : '내 플레이리스트 전체 추출'}
          </button>
          <button onClick={checkSession} disabled={loading} style={{ marginLeft: 8 }}>
            다시 확인
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p>상태 확인 실패</p>
          <button onClick={checkSession}>다시 확인</button>
        </div>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <p>플레이리스트 {result.playlists.length}개</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? '서버 전송 중...' : '서버로 전송'}
          </button>
          {uploadError && <p style={{ color: 'crimson' }}>서버 전송 실패: {uploadError}</p>}
          {uploadSucceeded && <p style={{ color: 'green' }}>서버 전송 완료</p>}
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
