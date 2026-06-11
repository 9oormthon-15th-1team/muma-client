import { describe, expect, it } from 'vitest'
import type { ExtractResult, MelonTrackResult, SpotifyTrack } from '../lib/types'
import { initialMigrationState, migrationReducer, type MigrationState } from './migration'

function makeTrack(id: string): SpotifyTrack {
  return {
    id,
    name: `track-${id}`,
    duration_ms: 1000,
    explicit: false,
    artists: [{ id: `a-${id}`, name: `artist-${id}` }],
    album: { id: `al-${id}`, name: `album-${id}` },
  }
}

function makeRow(
  playlistId: string,
  songId: string,
  candidateIds: string[],
  position = 1,
): MelonTrackResult {
  return {
    playlist_id: playlistId,
    position,
    melon_song_id: songId,
    title: `song-${songId}`,
    artists_text: 'artist',
    melon_artist_ids: '',
    album_title: 'album',
    melon_album_id: '',
    melon_likes: 0,
    melon_song_url: '',
    results: candidateIds.map(makeTrack),
  }
}

function makeResult(playlists: { seq: string; songIds: string[] }[]): ExtractResult {
  return {
    playlists: playlists.map(({ seq, songIds }) => ({
      seq,
      title: `playlist-${seq}`,
      songCount: songIds.length,
      songs: songIds.map((songId, i) => ({
        songId,
        trackNo: i + 1,
        title: `song-${songId}`,
        artist: 'artist',
        album: 'album',
      })),
    })),
    extractedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('migrationReducer', () => {
  it('main 화면에서 시작하고 START로 guide에 진입한다', () => {
    expect(initialMigrationState.screen).toBe('main')

    const next = migrationReducer(initialMigrationState, { type: 'START' })

    expect(next.screen).toBe('guide')
  })

  it('GUIDE_CONFIRMED는 loading으로, PLATFORM_CONFIRMED는 matching 화면으로 진행한다', () => {
    const onGuide: MigrationState = { ...initialMigrationState, screen: 'guide' }
    expect(migrationReducer(onGuide, { type: 'GUIDE_CONFIRMED' }).screen).toBe('loading')

    const onPlatform: MigrationState = { ...initialMigrationState, screen: 'platform' }
    expect(migrationReducer(onPlatform, { type: 'PLATFORM_CONFIRMED' }).screen).toBe('matching')
  })

  it('EXTRACT_STARTED는 이전 진행 데이터를 모두 비우되 화면은 바꾸지 않는다 (디버그 화면에서도 호출됨)', () => {
    const dirty: MigrationState = {
      ...initialMigrationState,
      screen: 'guide',
      result: makeResult([{ seq: '1', songIds: ['s1'] }]),
      selectedPlaylists: new Set(['1']),
      selectedSongs: new Set(['1:s1']),
      preview: [makeRow('1', 's1', ['t1'])],
      selected: { '1:s1': 't1' },
      exportStatuses: { '1': { status: 'success', exportedCount: 1 } },
      extractError: '이전 추출 에러',
      matchError: '이전 매칭 에러',
    }

    const next = migrationReducer(dirty, { type: 'EXTRACT_STARTED' })

    expect(next.screen).toBe('guide')
    expect(next.extracting).toBe(true)
    expect(next.result).toBeNull()
    expect(next.selectedPlaylists.size).toBe(0)
    expect(next.selectedSongs.size).toBe(0)
    expect(next.preview).toBeNull()
    expect(next.selected).toEqual({})
    expect(next.exportStatuses).toEqual({})
    expect(next.extractError).toBeNull()
    expect(next.matchError).toBeNull()
  })

  it('EXTRACT_SUCCEEDED는 결과를 저장하고 모든 플레이리스트와 곡을 기본 선택한다', () => {
    const extracting = migrationReducer(
      { ...initialMigrationState, screen: 'guide' },
      { type: 'EXTRACT_STARTED' },
    )
    const result = makeResult([
      { seq: '1', songIds: ['s1', 's2'] },
      { seq: '2', songIds: ['s3'] },
    ])

    const next = migrationReducer(extracting, { type: 'EXTRACT_SUCCEEDED', result })

    expect(next.extracting).toBe(false)
    expect(next.result).toBe(result)
    expect(next.selectedPlaylists).toEqual(new Set(['1', '2']))
    expect(next.selectedSongs).toEqual(new Set(['1:s1', '1:s2', '2:s3']))
  })

  it('LOADING_FINISHED는 추출 결과가 준비된 경우에만 select 화면으로 넘어간다', () => {
    const onLoading = migrationReducer(
      { ...initialMigrationState, screen: 'guide' },
      { type: 'GUIDE_CONFIRMED' },
    )
    const extracting = migrationReducer(onLoading, { type: 'EXTRACT_STARTED' })

    // 추출이 아직 진행 중이면 화면을 바꾸지 않는다
    expect(migrationReducer(extracting, { type: 'LOADING_FINISHED' }).screen).toBe('loading')

    const extracted = migrationReducer(extracting, {
      type: 'EXTRACT_SUCCEEDED',
      result: makeResult([{ seq: '1', songIds: ['s1'] }]),
    })

    expect(migrationReducer(extracted, { type: 'LOADING_FINISHED' }).screen).toBe('select')
  })

  it('MATCH_STARTED는 이전 매칭 데이터를 비우고 matching 화면에서 매칭을 시작한다', () => {
    const state: MigrationState = {
      ...initialMigrationState,
      screen: 'platform',
      result: makeResult([{ seq: '1', songIds: ['s1'] }]),
      selectedPlaylists: new Set(['1']),
      selectedSongs: new Set(['1:s1']),
      preview: [makeRow('1', 's1', ['t1'])],
      selected: { '1:s1': 't1' },
      exportStatuses: { '1': { status: 'success', exportedCount: 1 } },
      matchError: '이전 매칭 에러',
    }

    const next = migrationReducer(state, { type: 'MATCH_STARTED' })

    expect(next.screen).toBe('platform') // 화면 전환은 PLATFORM_CONFIRMED의 몫
    expect(next.matching).toBe(true)
    expect(next.preview).toBeNull()
    expect(next.selected).toEqual({})
    expect(next.exportStatuses).toEqual({})
    expect(next.matchError).toBeNull()
    // 추출 결과와 선택은 유지된다
    expect(next.result).toBe(state.result)
    expect(next.selectedPlaylists).toEqual(new Set(['1']))
  })

  it('MATCH_SUCCEEDED는 후보가 2개 이상인 곡에 첫 후보를 기본 선택한다', () => {
    const matching: MigrationState = { ...initialMigrationState, screen: 'matching', matching: true }
    const preview = [
      makeRow('1', 's1', ['t1']), // 후보 1개 → 자동 포함, 선택 불필요
      makeRow('1', 's2', ['t2', 't3']), // 후보 2개 → 첫 후보 기본 선택
      makeRow('1', 's3', []), // 후보 없음 → 선택 없음
    ]

    const next = migrationReducer(matching, { type: 'MATCH_SUCCEEDED', preview, failedCount: 0 })

    expect(next.matching).toBe(false)
    expect(next.preview).toBe(preview)
    expect(next.selected).toEqual({ '1:s2': 't2' })
    expect(next.matchError).toBeNull()
  })

  it('MATCH_SUCCEEDED는 일부 플레이리스트 실패 시 실패 건수를 알린다', () => {
    const matching: MigrationState = { ...initialMigrationState, screen: 'matching', matching: true }

    const next = migrationReducer(matching, {
      type: 'MATCH_SUCCEEDED',
      preview: [makeRow('1', 's1', ['t1'])],
      failedCount: 2,
    })

    expect(next.matchError).toBe('2개 플레이리스트 매칭 실패 (성공분만 표시)')
  })

  it('MATCHING_FINISHED는 확인 필요(후보 2개+) 곡이 있으면 review로, 전부 자동 매칭이면 review를 건너뛴다', () => {
    const matching: MigrationState = { ...initialMigrationState, screen: 'matching', matching: true }

    // 매칭이 아직 진행 중이면 화면을 바꾸지 않는다
    expect(migrationReducer(matching, { type: 'MATCHING_FINISHED' }).screen).toBe('matching')

    const withAmbiguous = migrationReducer(matching, {
      type: 'MATCH_SUCCEEDED',
      preview: [makeRow('1', 's1', ['t1', 't2'])],
      failedCount: 0,
    })
    expect(migrationReducer(withAmbiguous, { type: 'MATCHING_FINISHED' }).screen).toBe('review')

    const allAutoMatched = migrationReducer(matching, {
      type: 'MATCH_SUCCEEDED',
      preview: [makeRow('1', 's1', ['t1'])],
      failedCount: 0,
    })
    expect(migrationReducer(allAutoMatched, { type: 'MATCHING_FINISHED' }).screen).toBe('app')
  })

  it('SONG_TOGGLED는 곡 선택을 토글하고 플레이리스트 선택을 동기화하며 기존 매칭 결과를 무효화한다', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      screen: 'select',
      result: makeResult([{ seq: '1', songIds: ['s1', 's2'] }]),
      selectedPlaylists: new Set(['1']),
      selectedSongs: new Set(['1:s1']),
      preview: [makeRow('1', 's1', ['t1'])],
      selected: { '1:s1': 't1' },
      exportStatuses: { '1': { status: 'success', exportedCount: 1 } },
    }

    // 곡 추가 선택: 플레이리스트 선택 유지, 매칭 결과는 무효화
    const added = migrationReducer(base, { type: 'SONG_TOGGLED', playlistSeq: '1', songId: 's2' })
    expect(added.selectedSongs).toEqual(new Set(['1:s1', '1:s2']))
    expect(added.selectedPlaylists).toEqual(new Set(['1']))
    expect(added.preview).toBeNull()
    expect(added.selected).toEqual({})
    expect(added.exportStatuses).toEqual({})

    // 마지막 곡 해제: 플레이리스트 선택도 해제
    const removed = migrationReducer(base, { type: 'SONG_TOGGLED', playlistSeq: '1', songId: 's1' })
    expect(removed.selectedSongs.size).toBe(0)
    expect(removed.selectedPlaylists.size).toBe(0)
  })

  it('PLAYLIST_SONGS_TOGGLED는 해당 플레이리스트 곡 전체를 선택/해제하고 플레이리스트 선택을 따라가게 한다', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      screen: 'select',
      result: makeResult([{ seq: '1', songIds: ['s1', 's2'] }]),
      selectedPlaylists: new Set(),
      selectedSongs: new Set(['1:s1']),
    }

    // 일부만 선택된 상태 → 전체 선택 + 플레이리스트 포함
    const allOn = migrationReducer(base, { type: 'PLAYLIST_SONGS_TOGGLED', playlistSeq: '1' })
    expect(allOn.selectedSongs).toEqual(new Set(['1:s1', '1:s2']))
    expect(allOn.selectedPlaylists).toEqual(new Set(['1']))

    // 전체 선택된 상태 → 전체 해제 + 플레이리스트 제외
    const allOff = migrationReducer(allOn, { type: 'PLAYLIST_SONGS_TOGGLED', playlistSeq: '1' })
    expect(allOff.selectedSongs.size).toBe(0)
    expect(allOff.selectedPlaylists.size).toBe(0)
  })

  it('ALL_PLAYLISTS_TOGGLED는 전체 선택과 전체 해제 사이를 오간다 (곡 포함)', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      screen: 'select',
      result: makeResult([
        { seq: '1', songIds: ['s1'] },
        { seq: '2', songIds: ['s2'] },
      ]),
      selectedPlaylists: new Set(['1']),
      selectedSongs: new Set(['1:s1']),
    }

    // 일부만 선택 → 전체 선택
    const allOn = migrationReducer(base, { type: 'ALL_PLAYLISTS_TOGGLED' })
    expect(allOn.selectedPlaylists).toEqual(new Set(['1', '2']))
    expect(allOn.selectedSongs).toEqual(new Set(['1:s1', '2:s2']))

    // 전체 선택 → 전체 해제
    const allOff = migrationReducer(allOn, { type: 'ALL_PLAYLISTS_TOGGLED' })
    expect(allOff.selectedPlaylists.size).toBe(0)
    expect(allOff.selectedSongs.size).toBe(0)
  })

  it('PLAYLIST_TOGGLED는 플레이리스트와 그 곡들을 함께 토글한다', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      result: makeResult([
        { seq: '1', songIds: ['s1', 's2'] },
        { seq: '2', songIds: ['s3'] },
      ]),
      selectedPlaylists: new Set(['2']),
      selectedSongs: new Set(['2:s3']),
    }

    const added = migrationReducer(base, { type: 'PLAYLIST_TOGGLED', playlistSeq: '1' })
    expect(added.selectedPlaylists).toEqual(new Set(['1', '2']))
    expect(added.selectedSongs).toEqual(new Set(['1:s1', '1:s2', '2:s3']))

    const removed = migrationReducer(added, { type: 'PLAYLIST_TOGGLED', playlistSeq: '1' })
    expect(removed.selectedPlaylists).toEqual(new Set(['2']))
    expect(removed.selectedSongs).toEqual(new Set(['2:s3']))
  })

  it('REVIEW_SUBMITTED는 확정된 후보 선택을 반영하고 complete 화면으로 넘어간다', () => {
    const reviewing: MigrationState = {
      ...initialMigrationState,
      screen: 'review',
      preview: [makeRow('1', 's1', ['t1', 't2'])],
      selected: { '1:s1': 't1' },
    }

    const next = migrationReducer(reviewing, {
      type: 'REVIEW_SUBMITTED',
      selected: { '1:s1': 't2' },
    })

    expect(next.screen).toBe('complete')
    expect(next.selected).toEqual({ '1:s1': 't2' })
  })

  it('후보곡 선택/해제는 selected를 갱신하고 이전 내보내기 결과를 초기화한다', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      preview: [makeRow('1', 's1', ['t1', 't2'])],
      selected: { '1:s1': 't1' },
      exportStatuses: { '1': { status: 'success', exportedCount: 1 } },
    }

    const picked = migrationReducer(base, {
      type: 'TRACK_SELECTED',
      playlistId: '1',
      songId: 's1',
      trackId: 't2',
    })
    expect(picked.selected).toEqual({ '1:s1': 't2' })
    expect(picked.exportStatuses).toEqual({})

    const cleared = migrationReducer(picked, {
      type: 'TRACK_SELECTION_CLEARED',
      playlistId: '1',
      songId: 's1',
    })
    expect(cleared.selected).toEqual({})
  })

  it('EXPORT_STARTED는 잡이 있는 플레이리스트는 exporting, 없는 플레이리스트는 skipped로 표시한다', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      screen: 'complete',
      result: makeResult([
        { seq: '1', songIds: ['s1'] },
        { seq: '2', songIds: ['s2'] },
      ]),
      selectedPlaylists: new Set(['1', '2']),
      selectedSongs: new Set(['1:s1', '2:s2']),
      // 플레이리스트 1은 자동 포함 1곡, 2는 후보 2개인데 선택 없음 → 잡 없음
      preview: [makeRow('1', 's1', ['t1']), makeRow('2', 's2', ['t2', 't3'])],
    }
    const jobs = [
      { playlistSeq: '1', payload: { playlist_name: 'playlist-1', track_ids: ['t1'] } },
    ]

    const next = migrationReducer(base, { type: 'EXPORT_STARTED', jobs })

    expect(next.exporting).toBe(true)
    expect(next.exportStatuses['1']).toEqual({ status: 'exporting' })
    expect(next.exportStatuses['2']).toEqual({
      status: 'skipped',
      reason: '내보낼 수 있는 Spotify 후보가 없습니다.',
    })
  })

  it('EXPORT_STARTED에 잡이 하나도 없으면 모든 플레이리스트를 skipped로 표시하고 내보내기를 시작하지 않는다', () => {
    const base: MigrationState = {
      ...initialMigrationState,
      screen: 'complete',
      result: makeResult([{ seq: '1', songIds: ['s1'] }]),
      selectedPlaylists: new Set(['1']),
      selectedSongs: new Set(['1:s1']),
      preview: [makeRow('1', 's1', ['t1', 't2'])],
    }

    const next = migrationReducer(base, { type: 'EXPORT_STARTED', jobs: [] })

    expect(next.exporting).toBe(false)
    expect(next.exportStatuses['1']).toEqual({
      status: 'skipped',
      reason: '내보낼 수 있는 Spotify 후보가 없습니다.',
    })
  })

  it('플레이리스트별 내보내기 결과는 독립적으로 갱신되고 EXPORT_FINISHED로 종료한다', () => {
    const exporting: MigrationState = {
      ...initialMigrationState,
      exporting: true,
      exportStatuses: { '1': { status: 'exporting' }, '2': { status: 'exporting' } },
    }

    const oneDone = migrationReducer(exporting, {
      type: 'EXPORT_JOB_SUCCEEDED',
      playlistSeq: '1',
      exportedCount: 3,
    })
    expect(oneDone.exportStatuses['1']).toEqual({ status: 'success', exportedCount: 3 })
    // 다른 플레이리스트 상태는 건드리지 않는다
    expect(oneDone.exportStatuses['2']).toEqual({ status: 'exporting' })

    const oneFailed = migrationReducer(oneDone, {
      type: 'EXPORT_JOB_FAILED',
      playlistSeq: '2',
      error: 'Spotify API 오류',
    })
    expect(oneFailed.exportStatuses['2']).toEqual({ status: 'error', error: 'Spotify API 오류' })
    expect(oneFailed.exportStatuses['1']).toEqual({ status: 'success', exportedCount: 3 })

    const finished = migrationReducer(oneFailed, { type: 'EXPORT_FINISHED' })
    expect(finished.exporting).toBe(false)
  })

  it('BACK은 화면별 이전 단계로 되돌아간다', () => {
    const backOf = (screen: MigrationState['screen']) =>
      migrationReducer({ ...initialMigrationState, screen }, { type: 'BACK' }).screen

    expect(backOf('guide')).toBe('main')
    expect(backOf('loading')).toBe('guide')
    expect(backOf('select')).toBe('guide')
    expect(backOf('platform')).toBe('select')
    expect(backOf('matching')).toBe('platform')
    expect(backOf('review')).toBe('matching')
    expect(backOf('complete')).toBe('review')
    // 첫 화면과 레거시 디버그 화면은 뒤로가기가 없다
    expect(backOf('main')).toBe('main')
    expect(backOf('app')).toBe('app')
  })

  it('추출 실패는 에러를 기록하고, 중단은 에러 없이 추출만 멈춘다', () => {
    const onLoading = migrationReducer(
      { ...initialMigrationState, screen: 'guide' },
      { type: 'GUIDE_CONFIRMED' },
    )
    const extracting = migrationReducer(onLoading, { type: 'EXTRACT_STARTED' })

    const failed = migrationReducer(extracting, {
      type: 'EXTRACT_FAILED',
      error: '멜론에 로그인 후 다시 시도해주세요.',
    })
    expect(failed.extracting).toBe(false)
    expect(failed.extractError).toBe('멜론에 로그인 후 다시 시도해주세요.')
    expect(failed.screen).toBe('loading')

    const aborted = migrationReducer(extracting, { type: 'EXTRACT_ABORTED' })
    expect(aborted.extracting).toBe(false)
    expect(aborted.extractError).toBeNull()
  })

  it('SELECT_CONFIRMED는 select에서 platform 화면으로 진행한다', () => {
    const selecting: MigrationState = { ...initialMigrationState, screen: 'select' }

    expect(migrationReducer(selecting, { type: 'SELECT_CONFIRMED' }).screen).toBe('platform')
  })

  it('MATCH_FAILED는 매칭을 멈추고 에러를 기록한다', () => {
    const matching: MigrationState = { ...initialMigrationState, screen: 'matching', matching: true }

    const next = migrationReducer(matching, { type: 'MATCH_FAILED', error: '매칭 결과가 없습니다.' })

    expect(next.matching).toBe(false)
    expect(next.matchError).toBe('매칭 결과가 없습니다.')
  })

  it('SESSION_RESTORED는 저장된 진행 상태를 복원하되, 데이터가 없는 화면으로는 되돌리지 않는다', () => {
    const result = makeResult([{ seq: '1', songIds: ['s1'] }])

    // preview 없이 review 화면에서 닫힌 세션 → 데이터가 있는 select까지만 복원
    const next = migrationReducer(initialMigrationState, {
      type: 'SESSION_RESTORED',
      session: {
        screen: 'review',
        result,
        selectedPlaylists: ['1'],
        selectedSongs: ['1:s1'],
        preview: null,
        selected: {},
      },
    })

    expect(next.screen).toBe('select')
    expect(next.result).toBe(result)
    expect(next.selectedPlaylists).toEqual(new Set(['1']))
    expect(next.selectedSongs).toEqual(new Set(['1:s1']))

    // preview까지 있으면 저장된 화면 그대로 복원
    const preview = [makeRow('1', 's1', ['t1', 't2'])]
    const full = migrationReducer(initialMigrationState, {
      type: 'SESSION_RESTORED',
      session: {
        screen: 'review',
        result,
        selectedPlaylists: ['1'],
        selectedSongs: ['1:s1'],
        preview,
        selected: { '1:s1': 't1' },
      },
    })

    expect(full.screen).toBe('review')
    expect(full.preview).toBe(preview)
    expect(full.selected).toEqual({ '1:s1': 't1' })
  })
})
