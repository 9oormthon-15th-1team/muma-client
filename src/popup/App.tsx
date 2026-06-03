import { useEffect, useState } from 'react'
import type {
  CheckMelonSessionResponse,
  ExportToSpotifyResponse,
  ExtractAllResponse,
  ExtractResult,
  MelonSessionResult,
  MelonTrackResult,
  SpotifyTrack,
  UploadMelonTracksResponse,
} from '../lib/types'
import { mapExtractResultToMelonTracks } from '../lib/melonUpload'
import { memberKeyFromMlcp } from '../lib/melonClient'

const MELON_PLAYLIST_LIST_URL = 'https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm'

// 멜론 로그인 사용자의 memberKey를 쿠키에서 읽는다(팝업 전용, 페이지 무관).
// 멜론은 memberKey를 `keyCookie` 쿠키에 평문 숫자로 저장한다(우선). 없으면 MLCP(base64) 폴백.
async function readMelonMemberKey(): Promise<string | null> {
  const url = 'https://www.melon.com'
  try {
    const direct = await chrome.cookies.get({ url, name: 'keyCookie' })
    const v = direct?.value?.trim()
    if (v && /^\d+$/.test(v)) return v
    const mlcp = await chrome.cookies.get({ url, name: 'MLCP' })
    return memberKeyFromMlcp(mlcp?.value)
  } catch {
    return null
  }
}

// 멜론 실제 로그인 페이지(accounts.melon.com). 로그인 후 플레이리스트 목록으로 복귀시켜
// 콘텐츠 스크립트가 해당 탭에서 동작하도록 한다.
const MELON_LOGIN_TARGET =
  'https://accounts.melon.com/login/login.htm?redirectURL=' +
  encodeURIComponent('https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm')

type PopupStatus = 'checking' | 'not_melon' | 'content_not_ready' | 'ready' | 'error'

interface SpotifyPreviewPanelProps {
  btnClassName: string
  exporting: boolean
  exportError: string | null
  exportSucceeded: boolean
  playlistName: string
  preview: MelonTrackResult[]
  selected: Record<string, string>
  selectedCount: number
  spotifyLoggedIn: boolean
  onClearSelection: (songId: string) => void
  onExport: () => void
  onPlaylistNameChange: (name: string) => void
  onSelectTrack: (songId: string, trackId: string) => void
}

function smallestAlbumImage(track: SpotifyTrack): string | null {
  const images = track.album.images
  if (!images?.length) return null
  return [...images].sort((a, b) => a.width * a.height - b.width * b.height)[0].url
}

function SpotifyPreviewPanel({
  btnClassName,
  exporting,
  exportError,
  exportSucceeded,
  playlistName,
  preview,
  selected,
  selectedCount,
  spotifyLoggedIn,
  onClearSelection,
  onExport,
  onPlaylistNameChange,
  onSelectTrack,
}: SpotifyPreviewPanelProps) {
  // 후보가 2개 이상인 곡만 선택 대상(후보 1개 이하는 모호하지 않으므로 제외)
  const ambiguousPreview = preview
    .filter((row) => row.results.length >= 2)
    .sort((a, b) => a.position - b.position)

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="m-0 mb-2 font-semibold">Spotify 후보 선택</p>

      {ambiguousPreview.length === 0 ? (
        <p className="m-0 text-xs text-gray-400">선택이 필요한 곡이 없습니다.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {ambiguousPreview.map((row) => {
            const selectedTrackId = selected[row.melon_song_id]

            return (
              <div key={row.melon_song_id} className="mb-2">
                <div className="mb-0.5 flex items-start justify-between gap-2">
                  <p className="m-0 text-xs text-gray-700">
                    {row.position}. {row.title} — {row.artists_text}
                  </p>
                  {selectedTrackId && (
                    <button
                      type="button"
                      onClick={() => onClearSelection(row.melon_song_id)}
                      className="shrink-0 border-none bg-transparent p-0 text-[11px] text-gray-500 underline"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
                {row.results.map((track) => {
                  const imageUrl = smallestAlbumImage(track)

                  return (
                    <label
                      key={track.id}
                      className="flex cursor-pointer items-center gap-2 py-0.5 pl-3 text-xs"
                    >
                      <input
                        type="radio"
                        name={`spotify-track-${row.melon_song_id}`}
                        checked={selectedTrackId === track.id}
                        onChange={() => onSelectTrack(row.melon_song_id, track.id)}
                      />
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-6 w-6 rounded"
                        />
                      )}
                      <span>
                        {track.name} — {track.artists.map((a) => a.name).join(', ')}
                        <span className="text-gray-400"> · {track.album.name}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3">
        <label className="block text-xs text-gray-700">
          플레이리스트 이름
          <input
            type="text"
            value={playlistName}
            onChange={(e) => onPlaylistNameChange(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      {!spotifyLoggedIn && (
        <p className="mt-2 mb-0 text-xs text-amber-600">
          내보내려면 먼저 Spotify에 로그인하세요.
        </p>
      )}

      <button
        onClick={onExport}
        disabled={exporting || !spotifyLoggedIn || !playlistName.trim() || selectedCount === 0}
        className={`${btnClassName} mt-2`}
      >
        {exporting ? '내보내는 중...' : `Spotify로 내보내기 (${selectedCount}곡)`}
      </button>
      {exportError && <p className="text-red-600">내보내기 실패: {exportError}</p>}
      {exportSucceeded && <p className="text-green-600">Spotify 플레이리스트 생성 완료</p>}
    </div>
  )
}

export function App() {
  const [status, setStatus] = useState<PopupStatus>('checking')
  const [session, setSession] = useState<MelonSessionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [memberKey, setMemberKey] = useState<string | null>(null)

  // Spotify 매칭 미리보기 / 선택 / 내보내기
  // preview: 서버가 돌려준 곡별 Spotify 후보 목록
  const [preview, setPreview] = useState<MelonTrackResult[] | null>(null)
  // selected: melon_song_id → 선택된 Spotify track id (곡당 단일 선택)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [playlistName, setPlaylistName] = useState('My Muma Playlist')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSucceeded, setExportSucceeded] = useState(false)

  // Spotify
  const [spotifyLoggedIn, setSpotifyLoggedIn] = useState(false)
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)

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
      // 로그인 진위는 멜론 MLCP 쿠키로 판단(페이지 무관, 콘텐츠 스크립트 불필요)
      const key = await readMelonMemberKey()
      console.info('[muma] popup memberKey(keyCookie/MLCP):', key)
      setMemberKey(key)
      if (!key) {
        setSession({ status: 'LOGGED_OUT' })
        setStatus('ready')
        return
      }

      // 로그인 확인됨. 플레이리스트 개수는 콘텐츠 스크립트로 best-effort 조회.
      const tab = await getActiveMelonTab()
      if (!tab?.id) {
        // 멜론 탭이 활성화돼 있지 않아도 로그인은 확인됨(추출은 멜론 탭에서)
        setSession({ status: 'LOGGED_IN' })
        setStatus('ready')
        return
      }
      try {
        const res = (await chrome.tabs.sendMessage(tab.id, {
          type: 'CHECK_MELON_SESSION',
          memberKey: key,
        })) as CheckMelonSessionResponse
        // 로그인은 쿠키로 확정됐으므로, 콘텐츠 응답은 개수 보강용으로만 사용
        setSession(res.ok ? res.result : { status: 'LOGGED_IN' })
      } catch {
        // 콘텐츠 스크립트 미주입 등 — 로그인 자체는 확인됨
        setSession({ status: 'LOGGED_IN' })
      }
      setStatus('ready')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    void checkSession()
    chrome.runtime.sendMessage({ type: 'SPOTIFY_STATUS' }, (res) => {
      if (res?.loggedIn) setSpotifyLoggedIn(true)
    })
  }, [])

  async function handleExtract() {
    setLoading(true)
    setError(null)
    setUploadError(null)
    setResult(null)
    setPreview(null)
    setSelected({})
    setExportError(null)
    setExportSucceeded(false)
    try {
      const tab = await getActiveMelonTab()
      if (!tab?.id) {
        setStatus('not_melon')
        setLoading(false)
        return
      }
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_ALL',
        memberKey: memberKey ?? undefined,
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

  async function openMyMusic() {
    const url = memberKey ? `${MELON_PLAYLIST_LIST_URL}?memberKey=${memberKey}` : MELON_PLAYLIST_LIST_URL
    await chrome.tabs.create({ url })
  }

  async function handleUpload() {
    if (!result) return
    setUploading(true)
    setUploadError(null)
    setPreview(null)
    setSelected({})
    setExportError(null)
    setExportSucceeded(false)
    try {
      const tracks = mapExtractResultToMelonTracks(result)
      const res = (await chrome.runtime.sendMessage({
        type: 'UPLOAD_MELON_TRACKS',
        tracks,
      })) as UploadMelonTracksResponse

      if (res.ok) {
        setPreview(res.result)
      } else {
        setUploadError(res.error)
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  function selectTrack(songId: string, trackId: string) {
    setExportSucceeded(false)
    setExportError(null)
    setSelected((prev) => ({ ...prev, [songId]: trackId }))
  }

  function clearSelection(songId: string) {
    setExportSucceeded(false)
    setExportError(null)
    setSelected((prev) => {
      const next = { ...prev }
      delete next[songId]
      return next
    })
  }

  async function handleExport() {
    if (!preview) return
    // 곡 순서(position)대로 선택된 track id를 모은다
    const trackIds = [...preview]
      .sort((a, b) => a.position - b.position)
      .map((row) => selected[row.melon_song_id])
      .filter((id): id is string => Boolean(id))

    if (trackIds.length === 0) return

    setExporting(true)
    setExportError(null)
    setExportSucceeded(false)
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'EXPORT_TO_SPOTIFY',
        payload: { playlist_name: playlistName.trim(), track_ids: trackIds },
      })) as ExportToSpotifyResponse

      if (res.ok) {
        setExportSucceeded(true)
      } else {
        setExportError(res.error)
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(false)
    }
  }

  const handleSpotifyLogin = () => {
    setSpotifyLoading(true)
    setSpotifyError(null)
    chrome.runtime.sendMessage({ type: 'SPOTIFY_LOGIN' }, (res) => {
      console.log('[popup] SPOTIFY_LOGIN response:', res)
      setSpotifyLoading(false)
      if (res?.success) {
        setSpotifyLoggedIn(true)
      } else {
        setSpotifyError(res?.error ?? 'Login failed')
      }
    })
  }

  const handleSpotifyLogout = () => {
    chrome.runtime.sendMessage({ type: 'SPOTIFY_LOGOUT' }, (res) => {
      if (res?.success) {
        setSpotifyLoggedIn(false)
        setSpotifyError(null)
      }
    })
  }

  const btn =
    'cursor-pointer rounded-lg border-none bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-50'
  const selectedCount = Object.keys(selected).length

  return (
    <main className="w-90 p-4 font-sans">
      <h1 className="m-0 mb-3 text-base">Muma</h1>

      {import.meta.env.DEV && (
        <p className="m-0 mb-2 text-[11px] text-gray-500">
          [debug] memberKey(keyCookie): {memberKey ?? '없음(쿠키 미검출/로그아웃)'}
        </p>
      )}

      {/* Spotify 연결 */}
      <div className="mb-3 rounded bg-gray-100 p-2">
        <strong>Spotify</strong>
        {spotifyLoggedIn ? (
          <span>
            {' '}연결됨{' '}
            <button onClick={handleSpotifyLogout} className={`${btn} ml-1`}>로그아웃</button>
          </span>
        ) : (
          <span>
            {' '}
            <button onClick={handleSpotifyLogin} disabled={spotifyLoading} className={btn}>
              {spotifyLoading ? '로그인 중...' : '로그인'}
            </button>
          </span>
        )}
        {spotifyError && <p className="mt-1 mb-0 text-red-600">{spotifyError}</p>}
      </div>

      {status === 'checking' && <p>멜론 로그인 상태 확인 중...</p>}

      {status === 'not_melon' && (
        <div>
          <p>멜론 페이지에서 실행해주세요.</p>
          <button onClick={openMelonLogin} className={btn}>멜론 열기</button>
        </div>
      )}

      {status === 'content_not_ready' && (
        <div>
          <p>멜론 페이지를 새로고침한 뒤 다시 시도해주세요.</p>
          <button onClick={checkSession} className={btn}>다시 확인</button>
        </div>
      )}

      {status === 'ready' && session?.status === 'LOGGED_OUT' && (
        <div>
          <p>멜론 로그인이 필요합니다.</p>
          <button onClick={openMelonLogin} className={btn}>멜론 로그인하기</button>
          <button onClick={checkSession} className={`${btn} ml-2`}>
            다시 확인
          </button>
        </div>
      )}

      {status === 'ready' && session?.status === 'PLAYLIST_IDS_NOT_FOUND' && (
        <div>
          <p>로그인됨 — 플레이리스트를 불러오지 못했습니다. 내 플레이리스트 페이지에서 다시 시도해주세요.</p>
          <button onClick={openMyMusic} className={btn}>내 플레이리스트 열기</button>
          <button onClick={checkSession} className={`${btn} ml-2`}>
            다시 확인
          </button>
        </div>
      )}

      {status === 'ready' && session?.status === 'LOGGED_IN' && (
        <div>
          <p>
            {typeof session.playlistCount === 'number'
              ? `플레이리스트 ${session.playlistCount}개를 찾았습니다.`
              : '로그인됨 — 추출을 눌러 플레이리스트를 가져오세요.'}
          </p>
          <button onClick={handleExtract} disabled={loading} className={btn}>
            {loading ? '추출 중...' : '내 플레이리스트 전체 추출'}
          </button>
          <button onClick={checkSession} disabled={loading} className={`${btn} ml-2`}>
            다시 확인
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p>상태 확인 실패</p>
          <button onClick={checkSession} className={btn}>다시 확인</button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {result && (
        <div className="mt-3">
          <p>플레이리스트 {result.playlists.length}개</p>
          <button onClick={handleUpload} disabled={uploading} className={btn}>
            {uploading ? '매칭 중...' : 'Spotify 매칭 미리보기'}
          </button>
          {uploadError && <p className="text-red-600">매칭 실패: {uploadError}</p>}
          {result.playlists.map((pl) => (
            <details key={pl.seq} className="mb-2">
              <summary>
                {pl.title} ({pl.songCount}곡)
              </summary>
              <ol className="my-1 list-decimal pl-5">
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

      {preview && (
        <SpotifyPreviewPanel
          btnClassName={btn}
          exporting={exporting}
          exportError={exportError}
          exportSucceeded={exportSucceeded}
          playlistName={playlistName}
          preview={preview}
          selected={selected}
          selectedCount={selectedCount}
          spotifyLoggedIn={spotifyLoggedIn}
          onClearSelection={clearSelection}
          onExport={handleExport}
          onPlaylistNameChange={setPlaylistName}
          onSelectTrack={selectTrack}
        />
      )}
    </main>
  )
}
