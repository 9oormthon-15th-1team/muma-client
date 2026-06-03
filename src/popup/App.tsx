import { useEffect, useState } from 'react'
import type {
  CheckMelonSessionResponse,
  ExportToSpotifyResponse,
  ExtractAllResponse,
  ExtractResult,
  MelonSessionResult,
  MelonTrackResult,
  Playlist,
  SpotifyTrack,
} from '../lib/types'
import { mapExtractResultToMelonTracks, uploadMelonTracks } from '../lib/melonUpload'
import {
  buildExportTrackIds,
  buildPlaylistExportJobs,
  groupPreviewByPlaylist,
  spotifySelectionKey,
  type PlaylistExportStatusMap,
  type PlaylistPreviewGroup,
} from '../lib/playlistPreview'
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
  exportingAll: boolean
  exportStatuses: PlaylistExportStatusMap
  groups: PlaylistPreviewGroup[]
  selected: Record<string, string>
  totalCount: number
  autoIncludedCount: number
  spotifyLoggedIn: boolean
  onClearSelection: (playlistId: string, songId: string) => void
  onExportAll: () => void
  onSelectTrack: (playlistId: string, songId: string, trackId: string) => void
}

// 추출 곡 선택 키: 같은 곡이 여러 플레이리스트에 있을 수 있어 플레이리스트 스코프로 구분한다.
function songSelectionKey(playlistSeq: string, songId: string): string {
  return `${playlistSeq}:${songId}`
}

function smallestAlbumImage(track: SpotifyTrack): string | null {
  const images = track.album.images
  if (!images?.length) return null
  return [...images].sort((a, b) => a.width * a.height - b.width * b.height)[0].url
}

function SpotifyPreviewPanel({
  btnClassName,
  exportingAll,
  exportStatuses,
  groups,
  selected,
  totalCount,
  autoIncludedCount,
  spotifyLoggedIn,
  onClearSelection,
  onExportAll,
  onSelectTrack,
}: SpotifyPreviewPanelProps) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="m-0 mb-2 font-semibold">Spotify 후보 선택</p>

      {autoIncludedCount > 0 && (
        <p className="m-0 mb-2 text-xs text-gray-400">
          후보가 1개인 {autoIncludedCount}곡은 자동으로 포함됩니다.
        </p>
      )}

      {groups.length === 0 ? (
        <p className="m-0 text-xs text-gray-400">표시할 Spotify 후보가 없습니다.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {groups.map((group) => {
            const ambiguousPreview = group.rows.filter((row) => row.results.length >= 2)
            const exportTrackIds = buildExportTrackIds(group.rows, selected)
            const exportStatus = exportStatuses[group.playlist.seq] ?? { status: 'idle' as const }

            return (
              <section key={group.playlist.seq} className="mb-4 border-b border-gray-100 pb-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="m-0 text-sm font-semibold">{group.playlist.title}</p>
                    <p className="m-0 text-xs text-gray-400">
                      매칭 {group.rows.length}곡 · 내보내기 {exportTrackIds.length}곡
                    </p>
                  </div>
                  {exportStatus.status === 'exporting' && (
                    <span className="text-xs text-gray-500">전송 중...</span>
                  )}
                  {exportStatus.status === 'success' && (
                    <span className="text-xs text-green-600">
                      완료 {exportStatus.exportedCount}곡
                    </span>
                  )}
                  {exportStatus.status === 'error' && (
                    <span className="text-xs text-red-600">실패</span>
                  )}
                  {exportStatus.status === 'skipped' && (
                    <span className="text-xs text-gray-400">건너뜀</span>
                  )}
                </div>

                {exportStatus.status === 'error' && (
                  <p className="m-0 mb-2 text-xs text-red-600">
                    내보내기 실패: {exportStatus.error}
                  </p>
                )}
                {exportStatus.status === 'skipped' && (
                  <p className="m-0 mb-2 text-xs text-gray-400">{exportStatus.reason}</p>
                )}

                {ambiguousPreview.length === 0 ? (
                  <p className="m-0 text-xs text-gray-400">선택이 필요한 곡이 없습니다.</p>
                ) : (
                  ambiguousPreview
                    .sort((a, b) => a.position - b.position)
                    .map((row) => {
                      const key = spotifySelectionKey(row.playlist_id, row.melon_song_id)
                      const selectedTrackId = selected[key]

                      return (
                        <div key={key} className="mb-2">
                          <div className="mb-0.5 flex items-start justify-between gap-2">
                            <p className="m-0 text-xs text-gray-700">
                              {row.position}. {row.title} — {row.artists_text}
                            </p>
                            {selectedTrackId && (
                              <button
                                type="button"
                                onClick={() => onClearSelection(row.playlist_id, row.melon_song_id)}
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
                                  name={`spotify-track-${key}`}
                                  checked={selectedTrackId === track.id}
                                  onChange={() => onSelectTrack(row.playlist_id, row.melon_song_id, track.id)}
                                />
                                {imageUrl && (
                                  <img src={imageUrl} alt="" className="h-6 w-6 rounded" />
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
                    })
                )}
              </section>
            )
          })}
        </div>
      )}

      {!spotifyLoggedIn && (
        <p className="mt-2 mb-0 text-xs text-amber-600">
          내보내려면 먼저 Spotify에 로그인하세요.
        </p>
      )}

      <button
        onClick={onExportAll}
        disabled={exportingAll || !spotifyLoggedIn || totalCount === 0}
        className={`${btnClassName} mt-2`}
      >
        {exportingAll ? '내보내는 중...' : `Spotify로 플레이리스트별 내보내기 (${totalCount}곡)`}
      </button>
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
  // 추출된 플레이리스트 중 preview 요청 대상으로 선택된 seq 집합
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set())
  // 선택된 곡: `${playlist_seq}:${songId}` 집합 (플레이리스트 스코프)
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set())
  const [memberKey, setMemberKey] = useState<string | null>(null)

  // Spotify 매칭 미리보기 / 선택 / 내보내기
  // preview: 서버가 돌려준 곡별 Spotify 후보 목록
  const [preview, setPreview] = useState<MelonTrackResult[] | null>(null)
  // selected: `${playlist_id}:${melon_song_id}` → 선택된 Spotify track id (플레이리스트 스코프, 곡당 단일)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [exportingAll, setExportingAll] = useState(false)
  // 플레이리스트 seq → export 진행/결과 상태
  const [exportStatuses, setExportStatuses] = useState<PlaylistExportStatusMap>({})

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
    setSelectedPlaylists(new Set())
    setSelectedSongs(new Set())
    setPreview(null)
    setSelected({})
    setExportStatuses({})
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
        // 기본값: 추출된 플레이리스트 + 곡 전부 선택
        setSelectedPlaylists(new Set(res.result.playlists.map((pl) => pl.seq)))
        setSelectedSongs(
          new Set(
            res.result.playlists.flatMap((pl) =>
              pl.songs.map((s) => songSelectionKey(pl.seq, s.songId)),
            ),
          ),
        )
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
    if (!result || chosenPlaylists.length === 0) return
    setUploading(true)
    setUploadError(null)
    setPreview(null)
    setSelected({})
    setExportStatuses({})
    try {
      // 선택한 플레이리스트의 선택한 곡만 preview를 클라이언트에서 병렬 요청하고 결과를 병합한다.
      // 한 플레이리스트가 실패해도 나머지는 표시(부분 성공).
      const chosen = chosenPlaylists
      const settled = await Promise.allSettled(
        chosen.map((pl) =>
          uploadMelonTracks(
            mapExtractResultToMelonTracks({
              playlists: [pl],
              extractedAt: result.extractedAt,
            }),
          ),
        ),
      )

      const merged = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
      const failedCount = settled.filter((s) => s.status === 'rejected').length

      if (merged.length === 0) {
        const firstError = settled.find((s) => s.status === 'rejected') as
          | PromiseRejectedResult
          | undefined
        const reason = firstError?.reason
        setUploadError(reason instanceof Error ? reason.message : String(reason ?? '매칭 결과가 없습니다.'))
      } else {
        setPreview(merged)
        // 기본값: 후보가 2개 이상인 곡은 첫 번째 후보를 선택해 둔다.
        const defaultSelected: Record<string, string> = {}
        for (const row of merged) {
          if (row.results.length >= 2) {
            defaultSelected[spotifySelectionKey(row.playlist_id, row.melon_song_id)] =
              row.results[0].id
          }
        }
        setSelected(defaultSelected)
        if (failedCount > 0) {
          setUploadError(`${failedCount}개 플레이리스트 매칭 실패 (성공분만 표시)`)
        }
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  // 플레이리스트 선택이 바뀌면 기존 preview는 더 이상 그 집합과 일치하지 않으므로 초기화
  function resetPreviewState() {
    setPreview(null)
    setSelected({})
    setExportStatuses({})
  }

  function togglePlaylist(seq: string) {
    resetPreviewState()
    setSelectedPlaylists((prev) => {
      const next = new Set(prev)
      if (next.has(seq)) next.delete(seq)
      else next.add(seq)
      return next
    })
  }

  function toggleAllPlaylists() {
    if (!result) return
    resetPreviewState()
    setSelectedPlaylists((prev) =>
      prev.size === result.playlists.length
        ? new Set()
        : new Set(result.playlists.map((pl) => pl.seq)),
    )
  }

  function toggleSong(playlistSeq: string, songId: string) {
    resetPreviewState()
    setSelectedSongs((prev) => {
      const key = songSelectionKey(playlistSeq, songId)
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // 해당 플레이리스트의 곡 전체 선택/해제 토글
  function toggleAllSongs(pl: Playlist) {
    resetPreviewState()
    setSelectedSongs((prev) => {
      const keys = pl.songs.map((s) => songSelectionKey(pl.seq, s.songId))
      const allOn = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      for (const k of keys) {
        if (allOn) next.delete(k)
        else next.add(k)
      }
      return next
    })
  }

  function selectTrack(playlistId: string, songId: string, trackId: string) {
    setExportStatuses({})
    setSelected((prev) => ({
      ...prev,
      [spotifySelectionKey(playlistId, songId)]: trackId,
    }))
  }

  function clearSelection(playlistId: string, songId: string) {
    setExportStatuses({})
    setSelected((prev) => {
      const next = { ...prev }
      delete next[spotifySelectionKey(playlistId, songId)]
      return next
    })
  }

  async function handleExport() {
    if (!preview || previewGroups.length === 0) return

    // 클라이언트에서 플레이리스트별 잡(payload)을 순차 수집한다.
    const jobs = buildPlaylistExportJobs(previewGroups, selected)
    if (jobs.length === 0) {
      setExportStatuses(
        Object.fromEntries(
          previewGroups.map((group) => [
            group.playlist.seq,
            { status: 'skipped' as const, reason: '내보낼 수 있는 Spotify 후보가 없습니다.' },
          ]),
        ),
      )
      return
    }

    // 잡이 있는 플레이리스트는 exporting, 없는 건 skipped 로 초기화
    const initialStatuses: PlaylistExportStatusMap = {}
    for (const group of previewGroups) {
      initialStatuses[group.playlist.seq] = jobs.some((job) => job.playlistSeq === group.playlist.seq)
        ? { status: 'exporting' }
        : { status: 'skipped', reason: '내보낼 수 있는 Spotify 후보가 없습니다.' }
    }

    setExportingAll(true)
    setExportStatuses(initialStatuses)

    try {
      // 수집한 잡을 병렬 전송한다. 각 잡은 완료 즉시 해당 플레이리스트 상태만 갱신하며,
      // 한 플레이리스트의 실패가 다른 플레이리스트의 성공/실패 표시를 가리지 않는다.
      await Promise.all(
        jobs.map(async (job) => {
          try {
            const res = (await chrome.runtime.sendMessage({
              type: 'EXPORT_TO_SPOTIFY',
              payload: job.payload,
            })) as ExportToSpotifyResponse

            setExportStatuses((prev) => ({
              ...prev,
              [job.playlistSeq]: res.ok
                ? { status: 'success', exportedCount: job.payload.track_ids.length }
                : { status: 'error', error: res.error },
            }))
          } catch (e) {
            setExportStatuses((prev) => ({
              ...prev,
              [job.playlistSeq]: {
                status: 'error',
                error: e instanceof Error ? e.message : String(e),
              },
            }))
          }
        }),
      )
    } finally {
      setExportingAll(false)
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
  // 선택된 플레이리스트(추출 순서 유지) 및 플레이리스트별 그룹화된 preview
  const selectedPlaylistList =
    result?.playlists.filter((playlist) => selectedPlaylists.has(playlist.seq)) ?? []
  // 선택 플레이리스트 × 선택 곡만 남긴 실제 요청 대상
  const chosenPlaylists = selectedPlaylistList
    .map((pl) => ({
      ...pl,
      songs: pl.songs.filter((s) => selectedSongs.has(songSelectionKey(pl.seq, s.songId))),
    }))
    .filter((pl) => pl.songs.length > 0)
  const effectiveSongCount = chosenPlaylists.reduce((sum, pl) => sum + pl.songs.length, 0)
  const previewGroups: PlaylistPreviewGroup[] =
    preview && selectedPlaylistList.length > 0
      ? groupPreviewByPlaylist(selectedPlaylistList, preview)
      : []
  const exportJobs = buildPlaylistExportJobs(previewGroups, selected)
  // 자동 포함(후보 1개) + 사용자 선택(후보 2개+) 전체 합계
  const exportCount = exportJobs.reduce((sum, job) => sum + job.payload.track_ids.length, 0)
  const autoIncludedCount = previewGroups.reduce(
    (sum, group) => sum + group.rows.filter((row) => row.results.length === 1).length,
    0,
  )

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
          <div className="mb-1 flex items-center justify-between">
            <p className="m-0">
              플레이리스트 {result.playlists.length}개 (선택 {selectedPlaylists.size}개)
            </p>
            <button
              type="button"
              onClick={toggleAllPlaylists}
              className="border-none bg-transparent p-0 text-xs text-gray-500 underline"
            >
              {selectedPlaylists.size === result.playlists.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || effectiveSongCount === 0}
            className={btn}
          >
            {uploading
              ? '매칭 중...'
              : `선택 ${selectedPlaylists.size}개 · ${effectiveSongCount}곡 매칭 미리보기`}
          </button>
          {uploadError && <p className="text-red-600">매칭 실패: {uploadError}</p>}
          {result.playlists.map((pl) => {
            const playlistOn = selectedPlaylists.has(pl.seq)
            const selectedSongCount = pl.songs.filter((s) =>
              selectedSongs.has(songSelectionKey(pl.seq, s.songId)),
            ).length
            const allSongsOn = pl.songs.length > 0 && selectedSongCount === pl.songs.length

            return (
              <div key={pl.seq} className="mb-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={playlistOn}
                  onChange={() => togglePlaylist(pl.seq)}
                />
                <details className="flex-1">
                  <summary>
                    {pl.title} ({selectedSongCount}/{pl.songCount}곡)
                  </summary>
                  {playlistOn && (
                    <button
                      type="button"
                      onClick={() => toggleAllSongs(pl)}
                      className="mt-1 border-none bg-transparent p-0 text-[11px] text-gray-500 underline"
                    >
                      {allSongsOn ? '곡 전체 해제' : '곡 전체 선택'}
                    </button>
                  )}
                  <ul className="my-1 list-none pl-1">
                    {pl.songs.map((s) => (
                      <li key={s.songId}>
                        <label className="flex items-center gap-2 py-0.5 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedSongs.has(songSelectionKey(pl.seq, s.songId))}
                            disabled={!playlistOn}
                            onChange={() => toggleSong(pl.seq, s.songId)}
                          />
                          <span className={playlistOn ? '' : 'text-gray-400'}>
                            {s.title} — {s.artist}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )
          })}
        </div>
      )}

      {preview && (
        <SpotifyPreviewPanel
          btnClassName={btn}
          exportingAll={exportingAll}
          exportStatuses={exportStatuses}
          groups={previewGroups}
          selected={selected}
          totalCount={exportCount}
          autoIncludedCount={autoIncludedCount}
          spotifyLoggedIn={spotifyLoggedIn}
          onClearSelection={clearSelection}
          onExportAll={handleExport}
          onSelectTrack={selectTrack}
        />
      )}
    </main>
  )
}
