import type { ExtractResult, MelonTrackResult, TargetPlatform } from '../lib/types'
import {
  groupPreviewByPlaylist,
  songSelectionKey,
  spotifySelectionKey,
  type PlaylistExportJob,
  type PlaylistExportStatusMap,
} from '../lib/playlistPreview'
import { resolveRestoredScreen, type PersistedSession, type Screen } from './sessionState'

// Migration(한 번의 플레이리스트 이전 작업)의 생애주기를 담는 순수 리듀서.
// 화면 전환·선택 상태·매칭/내보내기 진행을 한 곳에서 관리한다.
export interface MigrationState {
  screen: Screen
  /** 이전 대상 플랫폼 (PLATFORM_CONFIRMED에서 확정, 기본 spotify) */
  platform: TargetPlatform
  /** 멜론에서 추출한 플레이리스트 전체 */
  result: ExtractResult | null
  /** preview 요청 대상으로 선택된 플레이리스트 seq 집합 */
  selectedPlaylists: Set<string>
  /** 선택된 곡: `${playlist_seq}:${songId}` 집합 (플레이리스트 스코프) */
  selectedSongs: Set<string>
  /** 서버가 돌려준 곡별 Spotify 후보 목록 */
  preview: MelonTrackResult[] | null
  /** `${playlist_id}:${melon_song_id}` → 선택된 Spotify track id */
  selected: Record<string, string>
  /** 플레이리스트 seq → export 진행/결과 상태 */
  exportStatuses: PlaylistExportStatusMap
  extracting: boolean
  matching: boolean
  exporting: boolean
  extractError: string | null
  matchError: string | null
}

export type MigrationEvent =
  // 화면 네비게이션
  | { type: 'START' }
  | { type: 'BACK' }
  | { type: 'GUIDE_CONFIRMED' }
  | { type: 'SELECT_CONFIRMED' }
  | { type: 'PLATFORM_CONFIRMED'; platform: TargetPlatform }
  // 멜론 추출
  | { type: 'EXTRACT_STARTED' }
  | { type: 'EXTRACT_SUCCEEDED'; result: ExtractResult }
  | { type: 'EXTRACT_FAILED'; error: string }
  | { type: 'EXTRACT_ABORTED' }
  | { type: 'LOADING_FINISHED' }
  // 플레이리스트/곡 선택
  | { type: 'SONG_TOGGLED'; playlistSeq: string; songId: string }
  | { type: 'PLAYLIST_SONGS_TOGGLED'; playlistSeq: string }
  | { type: 'PLAYLIST_TOGGLED'; playlistSeq: string }
  | { type: 'ALL_PLAYLISTS_TOGGLED' }
  // Spotify 매칭
  | { type: 'MATCH_STARTED' }
  | { type: 'MATCH_SUCCEEDED'; preview: MelonTrackResult[]; failedCount: number }
  | { type: 'MATCH_FAILED'; error: string }
  | { type: 'MATCHING_FINISHED' }
  // 후보 확인(Review)
  | { type: 'REVIEW_SUBMITTED'; selected: Record<string, string> }
  | { type: 'TRACK_SELECTED'; playlistId: string; songId: string; trackId: string }
  | { type: 'TRACK_SELECTION_CLEARED'; playlistId: string; songId: string }
  // Spotify 내보내기
  | { type: 'EXPORT_STARTED'; jobs: PlaylistExportJob[] }
  | { type: 'EXPORT_JOB_SUCCEEDED'; playlistSeq: string; exportedCount: number }
  | { type: 'EXPORT_JOB_FAILED'; playlistSeq: string; error: string }
  | { type: 'EXPORT_FINISHED' }
  // 세션 복원
  | { type: 'SESSION_RESTORED'; session: PersistedSession }

export const initialMigrationState: MigrationState = {
  screen: 'main',
  platform: 'spotify',
  result: null,
  selectedPlaylists: new Set(),
  selectedSongs: new Set(),
  preview: null,
  selected: {},
  exportStatuses: {},
  extracting: false,
  matching: false,
  exporting: false,
  extractError: null,
  matchError: null,
}

const NO_EXPORTABLE_TRACKS_REASON = '내보낼 수 있는 Spotify 후보가 없습니다.'

// 화면별 뒤로가기 목적지. 빠진 화면(main, app)은 뒤로가기가 없다.
const BACK_TARGET: Partial<Record<Screen, Screen>> = {
  guide: 'main',
  loading: 'guide',
  select: 'guide',
  platform: 'select',
  matching: 'platform',
  review: 'matching',
  complete: 'review',
}

// 선택이 바뀌면 기존 preview는 더 이상 그 집합과 일치하지 않으므로 무효화한다.
function invalidatePreview(state: MigrationState): MigrationState {
  return { ...state, preview: null, selected: {}, exportStatuses: {} }
}

// 모든 플레이리스트와 곡을 선택한 집합 쌍을 만든다.
function selectAllOf(result: ExtractResult): {
  selectedPlaylists: Set<string>
  selectedSongs: Set<string>
} {
  return {
    selectedPlaylists: new Set(result.playlists.map((pl) => pl.seq)),
    selectedSongs: new Set(
      result.playlists.flatMap((pl) => pl.songs.map((s) => songSelectionKey(pl.seq, s.songId))),
    ),
  }
}

export function migrationReducer(
  state: MigrationState,
  event: MigrationEvent,
): MigrationState {
  switch (event.type) {
    // --- 화면 네비게이션 ---
    case 'START':
      return { ...state, screen: 'guide' }
    case 'BACK': {
      const target = BACK_TARGET[state.screen]
      return target ? { ...state, screen: target } : state
    }
    case 'GUIDE_CONFIRMED':
      return { ...state, screen: 'loading' }
    case 'SELECT_CONFIRMED':
      return { ...state, screen: 'platform' }
    case 'PLATFORM_CONFIRMED':
      return { ...state, screen: 'matching', platform: event.platform }

    // --- 멜론 추출 ---
    // 화면 전환 없이 데이터만 초기화한다 — 플로우 화면과 레거시 디버그 화면 양쪽에서 호출된다.
    case 'EXTRACT_STARTED':
      return {
        ...initialMigrationState,
        screen: state.screen,
        extracting: true,
      }
    case 'EXTRACT_SUCCEEDED':
      // 기본값: 추출된 플레이리스트 + 곡 전부 선택
      return {
        ...state,
        extracting: false,
        result: event.result,
        ...selectAllOf(event.result),
      }
    case 'EXTRACT_FAILED':
      return { ...state, extracting: false, extractError: event.error }
    case 'EXTRACT_ABORTED':
      return { ...state, extracting: false }
    case 'LOADING_FINISHED':
      // 추출이 끝나고 결과가 있을 때만 선택 화면으로 (타이머가 흘려보내는 이벤트 가드)
      if (state.screen !== 'loading' || !state.result || state.extracting) return state
      return { ...state, screen: 'select' }

    // --- 플레이리스트/곡 선택 ---
    case 'SONG_TOGGLED': {
      const key = songSelectionKey(event.playlistSeq, event.songId)
      const willSelect = !state.selectedSongs.has(key)
      const selectedSongs = new Set(state.selectedSongs)
      if (willSelect) selectedSongs.add(key)
      else selectedSongs.delete(key)

      // 곡이 1개라도 선택돼 있으면 플레이리스트를 선택 상태로 동기화한다.
      const selectedPlaylists = new Set(state.selectedPlaylists)
      const pl = state.result?.playlists.find((p) => p.seq === event.playlistSeq)
      if (pl) {
        const otherSelected = pl.songs.some(
          (s) =>
            s.songId !== event.songId &&
            state.selectedSongs.has(songSelectionKey(pl.seq, s.songId)),
        )
        if (willSelect || otherSelected) selectedPlaylists.add(pl.seq)
        else selectedPlaylists.delete(pl.seq)
      }

      return { ...invalidatePreview(state), selectedSongs, selectedPlaylists }
    }
    case 'PLAYLIST_SONGS_TOGGLED': {
      const pl = state.result?.playlists.find((p) => p.seq === event.playlistSeq)
      if (!pl) return state
      const keys = pl.songs.map((s) => songSelectionKey(pl.seq, s.songId))
      const allOn = keys.every((k) => state.selectedSongs.has(k))
      const selectedSongs = new Set(state.selectedSongs)
      for (const k of keys) {
        if (allOn) selectedSongs.delete(k)
        else selectedSongs.add(k)
      }
      // 전체 선택 → 플레이리스트 포함, 전체 해제 → 제외
      const selectedPlaylists = new Set(state.selectedPlaylists)
      if (allOn) selectedPlaylists.delete(pl.seq)
      else selectedPlaylists.add(pl.seq)
      return { ...invalidatePreview(state), selectedSongs, selectedPlaylists }
    }
    case 'PLAYLIST_TOGGLED': {
      const adding = !state.selectedPlaylists.has(event.playlistSeq)
      const selectedPlaylists = new Set(state.selectedPlaylists)
      if (adding) selectedPlaylists.add(event.playlistSeq)
      else selectedPlaylists.delete(event.playlistSeq)

      // 플레이리스트 선택/해제 시 해당 곡도 일괄 토글
      const selectedSongs = new Set(state.selectedSongs)
      const pl = state.result?.playlists.find((p) => p.seq === event.playlistSeq)
      if (pl) {
        for (const s of pl.songs) {
          const key = songSelectionKey(pl.seq, s.songId)
          if (adding) selectedSongs.add(key)
          else selectedSongs.delete(key)
        }
      }
      return { ...invalidatePreview(state), selectedPlaylists, selectedSongs }
    }
    case 'ALL_PLAYLISTS_TOGGLED': {
      if (!state.result) return state
      const wasAllSelected = state.selectedPlaylists.size === state.result.playlists.length
      if (wasAllSelected) {
        return {
          ...invalidatePreview(state),
          selectedPlaylists: new Set(),
          selectedSongs: new Set(),
        }
      }
      return { ...invalidatePreview(state), ...selectAllOf(state.result) }
    }

    // --- Spotify 매칭 ---
    case 'MATCH_STARTED':
      return {
        ...state,
        matching: true,
        preview: null,
        selected: {},
        exportStatuses: {},
        matchError: null,
      }
    case 'MATCH_SUCCEEDED': {
      // 기본값: 후보가 2개 이상인 곡은 첫 번째 후보를 선택해 둔다.
      const defaultSelected: Record<string, string> = {}
      for (const row of event.preview) {
        if (row.results.length >= 2) {
          defaultSelected[spotifySelectionKey(row.playlist_id, row.melon_song_id)] =
            row.results[0].id
        }
      }
      return {
        ...state,
        matching: false,
        preview: event.preview,
        selected: defaultSelected,
        matchError:
          event.failedCount > 0
            ? `${event.failedCount}개 플레이리스트 매칭 실패 (성공분만 표시)`
            : null,
      }
    }
    case 'MATCH_FAILED':
      return { ...state, matching: false, matchError: event.error }
    case 'MATCHING_FINISHED': {
      if (state.screen !== 'matching' || !state.preview || state.matching) return state
      // 확인 필요(후보 2개+) 곡이 있으면 review, 전부 자동 매칭이면 건너뛴다
      const ambiguous = state.preview.filter((r) => r.results.length >= 2)
      return { ...state, screen: ambiguous.length > 0 ? 'review' : 'app' }
    }

    // --- 후보 확인(Review) ---
    case 'REVIEW_SUBMITTED':
      return { ...state, screen: 'complete', selected: event.selected }
    case 'TRACK_SELECTED':
      return {
        ...state,
        exportStatuses: {},
        selected: {
          ...state.selected,
          [spotifySelectionKey(event.playlistId, event.songId)]: event.trackId,
        },
      }
    case 'TRACK_SELECTION_CLEARED': {
      const selected = { ...state.selected }
      delete selected[spotifySelectionKey(event.playlistId, event.songId)]
      return { ...state, exportStatuses: {}, selected }
    }

    // --- Spotify 내보내기 ---
    case 'EXPORT_STARTED': {
      if (!state.result || !state.preview) return state
      const selectedPlaylistList = state.result.playlists.filter((pl) =>
        state.selectedPlaylists.has(pl.seq),
      )
      const groups = groupPreviewByPlaylist(selectedPlaylistList, state.preview)
      // 잡이 있는 플레이리스트는 exporting, 없는 건 skipped 로 초기화
      const exportStatuses: PlaylistExportStatusMap = {}
      for (const group of groups) {
        exportStatuses[group.playlist.seq] = event.jobs.some(
          (job) => job.playlistSeq === group.playlist.seq,
        )
          ? { status: 'exporting' }
          : { status: 'skipped', reason: NO_EXPORTABLE_TRACKS_REASON }
      }
      return { ...state, exporting: event.jobs.length > 0, exportStatuses }
    }
    case 'EXPORT_JOB_SUCCEEDED':
      return {
        ...state,
        exportStatuses: {
          ...state.exportStatuses,
          [event.playlistSeq]: { status: 'success', exportedCount: event.exportedCount },
        },
      }
    case 'EXPORT_JOB_FAILED':
      return {
        ...state,
        exportStatuses: {
          ...state.exportStatuses,
          [event.playlistSeq]: { status: 'error', error: event.error },
        },
      }
    case 'EXPORT_FINISHED':
      return { ...state, exporting: false }

    // --- 세션 복원 ---
    case 'SESSION_RESTORED': {
      const { session } = event
      return {
        ...state,
        screen: resolveRestoredScreen(session.screen, !!session.result, !!session.preview),
        // platform 없는 구버전 세션은 기본값(spotify)으로 복원한다.
        platform: session.platform ?? 'spotify',
        result: session.result,
        selectedPlaylists: new Set(session.selectedPlaylists),
        selectedSongs: new Set(session.selectedSongs),
        preview: session.preview,
        selected: session.selected,
      }
    }
    default:
      return state
  }
}
