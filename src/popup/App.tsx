import { useEffect, useReducer, useState } from 'react'
import type {
  CheckMelonSessionResponse,
  MelonSessionResult,
  Playlist,
  SpotifyTrack,
} from '../lib/types'
import { previewMelonTracks } from '../api/client'
import {
  buildExportTrackIds,
  buildPlaylistExportJobs,
  groupPreviewByPlaylist,
  mapExtractResultToMelonTracks,
  songSelectionKey,
  spotifySelectionKey,
  type PlaylistExportStatusMap,
  type PlaylistPreviewGroup,
} from '../lib/playlistPreview'
import { memberKeyFromMlcp } from '../lib/melonClient'
import { loadSession, saveSession } from './sessionState'
import { initialMigrationState, migrationReducer } from './migration'
import {
  getSpotifyStatus,
  requestSpotifyExport,
  spotifyLogin,
  spotifyLogout,
} from './backgroundMessages'
import { extractFromMelon, openMelonLogin, openMyMusicPlaylists } from './melonExtraction'
import { MainScreen } from './screens/MainScreen'
import { GuideScreen } from './screens/GuideScreen'
import { LoadingScreen } from './screens/LoadingScreen'
import { SelectScreen } from './screens/SelectScreen'
import { PlatformScreen } from './screens/PlatformScreen'
import { MatchingScreen } from './screens/MatchingScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { CompleteScreen } from './screens/CompleteScreen'

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
  // Migration(플레이리스트 이전 작업)의 화면 흐름·선택·매칭·내보내기 상태는 리듀서가 관리한다.
  const [migration, dispatch] = useReducer(migrationReducer, initialMigrationState)
  const { screen, result, selectedPlaylists, selectedSongs, preview, selected, exportStatuses } =
    migration
  const loading = migration.extracting
  const uploading = migration.matching
  const exportingAll = migration.exporting
  const error = migration.extractError
  const uploadError = migration.matchError

  const [status, setStatus] = useState<PopupStatus>('checking')
  const [session, setSession] = useState<MelonSessionResult | null>(null)
  // 멜론 세션 확인 실패 에러 (Migration 플로우와 무관한 팝업 상태 점검용)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [memberKey, setMemberKey] = useState<string | null>(null)

  // Spotify
  const [spotifyLoggedIn, setSpotifyLoggedIn] = useState(false)
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)

  // 팝업 재오픈 시 chrome.storage.session에서 진행 상태 복원 (#10).
  // 복원이 끝나기 전에는 화면을 그리지 않아 main 화면이 잠깐 보이는 깜빡임을 막는다.
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    void loadSession()
      .then((saved) => {
        if (!saved) return
        dispatch({ type: 'SESSION_RESTORED', session: saved })
      })
      .finally(() => setRestored(true))
  }, [])

  useEffect(() => {
    if (!restored) return
    void saveSession({
      screen,
      result,
      selectedPlaylists: [...selectedPlaylists],
      selectedSongs: [...selectedSongs],
      preview,
      selected,
    })
  }, [restored, screen, result, selectedPlaylists, selectedSongs, preview, selected])

  async function getActiveMelonTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.includes('melon.com')) return null
    return tab
  }

  async function checkSession() {
    setStatus('checking')
    setCheckError(null)
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
      setCheckError(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    void checkSession()
    void getSpotifyStatus()
      .then((res) => {
        if (res.loggedIn) setSpotifyLoggedIn(true)
      })
      // 백그라운드 미응답 시 비로그인으로 간주 (best-effort 조회)
      .catch(() => {})
  }, [])

  // 로딩 완료 시 선택 화면으로 자동 전환 (전환 조건 판정은 리듀서가 한다)
  useEffect(() => {
    if (screen === 'loading' && result && !loading) {
      const timer = setTimeout(() => dispatch({ type: 'LOADING_FINISHED' }), 600)
      return () => clearTimeout(timer)
    }
  }, [screen, result, loading])

  // 매칭 완료 시 review 또는 app 화면으로 자동 전환 (분기 판정은 리듀서가 한다)
  useEffect(() => {
    if (screen === 'matching' && preview && !uploading) {
      const timer = setTimeout(() => dispatch({ type: 'MATCHING_FINISHED' }), 600)
      return () => clearTimeout(timer)
    }
  }, [screen, preview, uploading])

  async function handleExtract() {
    dispatch({ type: 'EXTRACT_STARTED' })

    // 로그인(쿠키)이 없으면 데이터를 가져올 수 없으므로 멜론 로그인 페이지로 보낸다.
    if (!memberKey) {
      dispatch({ type: 'EXTRACT_ABORTED' })
      setSession({ status: 'LOGGED_OUT' })
      await openMelonLogin(true)
      return
    }

    const outcome = await extractFromMelon(memberKey)
    if (outcome.ok) {
      dispatch({ type: 'EXTRACT_SUCCEEDED', result: outcome.result })
      setSession({ status: 'LOGGED_IN', playlistCount: outcome.result.playlists.length })
      return
    }

    // 선언된 추출 에러 코드 → 사용자 안내 문구·세션 상태 매핑
    switch (outcome.code) {
      case 'NOT_LOGGED_IN':
        dispatch({ type: 'EXTRACT_FAILED', error: '멜론에 로그인 후 다시 시도해주세요.' })
        setSession({ status: 'LOGGED_OUT' })
        break
      case 'PLAYLIST_NOT_FOUND':
        dispatch({
          type: 'EXTRACT_FAILED',
          error: '플레이리스트를 찾지 못했습니다. 멜론에 로그인한 계정인지 확인해주세요.',
        })
        setSession({ status: 'PLAYLIST_IDS_NOT_FOUND', playlistCount: 0 })
        break
      case 'TAB_OPEN_FAILED':
        dispatch({ type: 'EXTRACT_FAILED', error: '멜론 탭을 열 수 없어요. 다시 시도해주세요.' })
        break
      case 'PAGE_LOAD_FAILED':
        dispatch({
          type: 'EXTRACT_FAILED',
          error: '멜론 페이지를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
        })
        break
      case 'CONTENT_ERROR':
        dispatch({ type: 'EXTRACT_FAILED', error: `추출 실패: ${outcome.message}` })
        break
      case 'UNKNOWN':
        dispatch({ type: 'EXTRACT_FAILED', error: outcome.message ?? '알 수 없는 오류' })
        break
    }
  }

  async function handleUpload() {
    if (!result || chosenPlaylists.length === 0) return
    dispatch({ type: 'MATCH_STARTED' })
    try {
      // 선택한 플레이리스트의 선택한 곡만 preview를 클라이언트에서 병렬 요청하고 결과를 병합한다.
      // 한 플레이리스트가 실패해도 나머지는 표시(부분 성공).
      const chosen = chosenPlaylists
      const settled = await Promise.allSettled(
        chosen.map((pl) =>
          previewMelonTracks(
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
        dispatch({
          type: 'MATCH_FAILED',
          error: reason instanceof Error ? reason.message : String(reason ?? '매칭 결과가 없습니다.'),
        })
      } else {
        dispatch({ type: 'MATCH_SUCCEEDED', preview: merged, failedCount })
      }
    } catch (e) {
      dispatch({ type: 'MATCH_FAILED', error: e instanceof Error ? e.message : String(e) })
    }
  }

  // 레거시 디버그 화면 전용: 플레이리스트 선택/해제 시 해당 곡도 일괄 토글
  function togglePlaylist(seq: string) {
    dispatch({ type: 'PLAYLIST_TOGGLED', playlistSeq: seq })
  }

  function toggleAllPlaylists() {
    dispatch({ type: 'ALL_PLAYLISTS_TOGGLED' })
  }

  function toggleSong(playlistSeq: string, songId: string) {
    dispatch({ type: 'SONG_TOGGLED', playlistSeq, songId })
  }

  // 해당 플레이리스트의 곡 전체 선택/해제 토글 (카드 왼쪽 체크 버튼)
  function toggleAllSongs(pl: Playlist) {
    dispatch({ type: 'PLAYLIST_SONGS_TOGGLED', playlistSeq: pl.seq })
  }

  function selectTrack(playlistId: string, songId: string, trackId: string) {
    dispatch({ type: 'TRACK_SELECTED', playlistId, songId, trackId })
  }

  function clearSelection(playlistId: string, songId: string) {
    dispatch({ type: 'TRACK_SELECTION_CLEARED', playlistId, songId })
  }

  async function handleExport(selectionOverride?: Record<string, string>) {
    if (!preview || previewGroups.length === 0) return

    // review 화면에서 막 확정한 선택은 dispatch 직후라 state 반영 전이므로 인자로 우선 사용한다.
    const sel = selectionOverride ?? selected
    // 클라이언트에서 플레이리스트별 잡(payload)을 순차 수집한다.
    const jobs = buildPlaylistExportJobs(previewGroups, sel)
    // 잡이 있는 플레이리스트는 exporting, 없는 건 skipped 로 초기화된다.
    dispatch({ type: 'EXPORT_STARTED', jobs })
    if (jobs.length === 0) return

    try {
      // 수집한 잡을 병렬 전송한다. 각 잡은 완료 즉시 해당 플레이리스트 상태만 갱신하며,
      // 한 플레이리스트의 실패가 다른 플레이리스트의 성공/실패 표시를 가리지 않는다.
      await Promise.all(
        jobs.map(async (job) => {
          try {
            const res = await requestSpotifyExport(job.payload)

            if (res.ok) {
              dispatch({
                type: 'EXPORT_JOB_SUCCEEDED',
                playlistSeq: job.playlistSeq,
                exportedCount: job.payload.track_ids.length,
              })
            } else {
              dispatch({ type: 'EXPORT_JOB_FAILED', playlistSeq: job.playlistSeq, error: res.error })
            }
          } catch (e) {
            dispatch({
              type: 'EXPORT_JOB_FAILED',
              playlistSeq: job.playlistSeq,
              error: e instanceof Error ? e.message : String(e),
            })
          }
        }),
      )
    } finally {
      dispatch({ type: 'EXPORT_FINISHED' })
    }
  }

  const handleSpotifyLogin = () => {
    setSpotifyLoading(true)
    setSpotifyError(null)
    spotifyLogin()
      .then((res) => {
        if (res.success) {
          setSpotifyLoggedIn(true)
        } else {
          setSpotifyError(res.error ?? 'Login failed')
        }
      })
      .catch((e: unknown) => setSpotifyError(e instanceof Error ? e.message : String(e)))
      .finally(() => setSpotifyLoading(false))
  }

  const handleSpotifyLogout = () => {
    void spotifyLogout()
      .then((res) => {
        if (res.success) {
          setSpotifyLoggedIn(false)
          setSpotifyError(null)
        }
      })
      .catch(() => {})
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

  // 세션 복원 전에는 그리지 않는다 (복원 직후 화면으로 바로 진입)
  if (!restored) {
    return null
  }

  if (screen === 'main') {
    return <MainScreen onStart={() => dispatch({ type: 'START' })} />
  }

  if (screen === 'guide') {
    return (
      <GuideScreen
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => {
          dispatch({ type: 'GUIDE_CONFIRMED' })
          void handleExtract()
        }}
      />
    )
  }

  if (screen === 'loading') {
    const loadingSteps = [
      { label: '계정연결', done: status === 'ready' || !!result },
      { label: '플레이리스트 목록', done: !!result },
      { label: '상세곡들', done: !!result && result.playlists.every((pl) => pl.songs.length > 0) },
    ]
    const allDone = loadingSteps.every((s) => s.done)
    const progress = loadingSteps.filter((s) => s.done).length / loadingSteps.length * 100

    if (allDone) {
      return (
        <LoadingScreen
          onBack={() => dispatch({ type: 'BACK' })}
          progress={100}
          statusMessage="완료! 다음 단계로 이동합니다."
          steps={loadingSteps}
        />
      )
    }

    return (
      <LoadingScreen
        onBack={() => dispatch({ type: 'BACK' })}
        progress={loading ? Math.max(progress, 15) : progress}
        statusMessage={
          error
            ? error
            : loading
              ? '멜론 계정에 저장된 플레이리스트를 확인하고 있어요.'
              : '준비 중...'
        }
        steps={loadingSteps}
      />
    )
  }

  if (screen === 'select' && result) {
    return (
      <SelectScreen
        playlists={result.playlists}
        selectedPlaylists={selectedPlaylists}
        selectedSongs={selectedSongs}
        canProceed={chosenPlaylists.length > 0}
        onToggleAllPlaylists={toggleAllPlaylists}
        onToggleSong={toggleSong}
        onToggleAllSongs={toggleAllSongs}
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => dispatch({ type: 'SELECT_CONFIRMED' })}
      />
    )
  }

  if (screen === 'platform') {
    return (
      <PlatformScreen
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={(platform) => {
          if (platform === 'spotify') {
            // Spotify 로그인 확인 후 매칭 시작
            if (spotifyLoggedIn) {
              dispatch({ type: 'PLATFORM_CONFIRMED' })
              void handleUpload()
            } else {
              // OAuth 로그인 트리거 → 성공 시 매칭 진행
              setSpotifyLoading(true)
              spotifyLogin()
                .then((res) => {
                  if (res.success) {
                    setSpotifyLoggedIn(true)
                    dispatch({ type: 'PLATFORM_CONFIRMED' })
                    void handleUpload()
                  } else {
                    setSpotifyError(res.error ?? 'Login failed')
                  }
                })
                .catch((e: unknown) =>
                  setSpotifyError(e instanceof Error ? e.message : String(e)),
                )
                .finally(() => setSpotifyLoading(false))
            }
          }
        }}
      />
    )
  }

  if (screen === 'matching') {
    const totalSongs = effectiveSongCount
    const matchedCount = preview?.filter((r) => r.results.length > 0).length ?? 0
    const processingCount = uploading ? Math.max(totalSongs - matchedCount, 0) : 0
    const matchProgress = totalSongs > 0 ? (matchedCount / totalSongs) * 100 : 0

    return (
      <MatchingScreen
        onBack={() => dispatch({ type: 'BACK' })}
        playlistCount={selectedPlaylistList.length}
        totalSongs={totalSongs}
        matchedCount={matchedCount}
        processingCount={processingCount}
        progress={uploading ? Math.max(matchProgress, 10) : matchProgress}
      />
    )
  }

  if (screen === 'review' && preview) {
    const ambiguous = preview
      .filter((r) => r.results.length >= 2)
      .sort((a, b) => a.position - b.position)
    const autoMatched = preview.filter((r) => r.results.length === 1).length

    return (
      <ReviewScreen
        onBack={() => dispatch({ type: 'BACK' })}
        tracks={ambiguous}
        autoMatchedCount={autoMatched}
        onNext={(reviewSelected) => {
          dispatch({ type: 'REVIEW_SUBMITTED', selected: reviewSelected })
          // 후보 선택 완료 → 내보내기 실행 (dispatch 반영 전이므로 선택값을 직접 전달)
          void handleExport(reviewSelected)
        }}
      />
    )
  }

  if (screen === 'complete') {
    const totalSongs = effectiveSongCount
    const exportedCount = preview ? buildExportTrackIds(preview, selected).length : 0

    return (
      <CompleteScreen
        onBack={() => dispatch({ type: 'BACK' })}
        playlistCount={chosenPlaylists.length}
        songCount={exportedCount}
        totalSelected={totalSongs}
      />
    )
  }

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
          <button onClick={() => void openMelonLogin()} className={btn}>멜론 열기</button>
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
          <button onClick={() => void openMelonLogin()} className={btn}>멜론 로그인하기</button>
          <button onClick={checkSession} className={`${btn} ml-2`}>
            다시 확인
          </button>
        </div>
      )}

      {status === 'ready' && session?.status === 'PLAYLIST_IDS_NOT_FOUND' && (
        <div>
          <p>로그인됨 — 플레이리스트를 불러오지 못했습니다. 내 플레이리스트 페이지에서 다시 시도해주세요.</p>
          <button onClick={() => void openMyMusicPlaylists(memberKey)} className={btn}>내 플레이리스트 열기</button>
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

      {(error ?? checkError) && <p className="text-red-600">{error ?? checkError}</p>}
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
