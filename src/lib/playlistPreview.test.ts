import { describe, expect, test } from 'vitest'
import type { ExtractResult, MelonTrackRequest, MelonTrackResult, Playlist } from './types'
import {
  buildExportTrackIds,
  buildPlaylistExportJobs,
  groupPreviewByPlaylist,
  mapExtractResultToMelonTracks,
  spotifySelectionKey,
} from './playlistPreview'

const playlists: Playlist[] = [
  {
    seq: 'playlist-a',
    title: '출근길',
    songCount: 2,
    songs: [],
  },
  {
    seq: 'playlist-b',
    title: '운동',
    songCount: 2,
    songs: [],
  },
]

function row(
  playlistId: string,
  songId: string,
  position: number,
  resultIds: string[],
): MelonTrackResult {
  return {
    playlist_id: playlistId,
    position,
    melon_song_id: songId,
    title: `melon-${songId}`,
    artists_text: 'artist',
    melon_artist_ids: '',
    album_title: 'album',
    melon_album_id: '',
    melon_likes: 0,
    melon_song_url: `https://www.melon.com/song/detail.htm?songId=${songId}`,
    results: resultIds.map((id) => ({
      id,
      name: `spotify-${id}`,
      duration_ms: 180000,
      explicit: false,
      artists: [{ id: `artist-${id}`, name: 'artist' }],
      album: {
        id: `album-${id}`,
        name: 'album',
        images: [],
      },
    })),
  }
}

describe('groupPreviewByPlaylist', () => {
  test('groups preview rows by playlist_id and preserves extracted playlist order', () => {
    const preview = [
      row('playlist-b', 'song-3', 2, ['spotify-3']),
      row('playlist-a', 'song-1', 2, ['spotify-1']),
      row('playlist-a', 'song-2', 1, ['spotify-2']),
    ]

    expect(groupPreviewByPlaylist(playlists, preview)).toEqual([
      {
        playlist: playlists[0],
        rows: [preview[2], preview[1]],
      },
      {
        playlist: playlists[1],
        rows: [preview[0]],
      },
    ])
  })

  test('omits selected playlists that received no preview rows', () => {
    expect(groupPreviewByPlaylist(playlists, [row('playlist-b', 'song-3', 1, [])])).toEqual([
      {
        playlist: playlists[1],
        rows: [row('playlist-b', 'song-3', 1, [])],
      },
    ])
  })
})

describe('buildExportTrackIds', () => {
  test('includes single candidates automatically and selected ambiguous candidates only', () => {
    const rows = [
      row('playlist-a', 'single', 2, ['spotify-single']),
      row('playlist-a', 'ambiguous', 1, ['spotify-wrong', 'spotify-right']),
      row('playlist-a', 'missing', 3, []),
    ]
    const selected = {
      [spotifySelectionKey('playlist-a', 'ambiguous')]: 'spotify-right',
    }

    expect(buildExportTrackIds(rows, selected)).toEqual([
      'spotify-right',
      'spotify-single',
    ])
  })

  test('uses playlist-scoped keys so duplicate melon song ids do not collide', () => {
    const selected = {
      [spotifySelectionKey('playlist-a', 'same-song')]: 'spotify-a',
      [spotifySelectionKey('playlist-b', 'same-song')]: 'spotify-b',
    }

    expect(buildExportTrackIds([row('playlist-a', 'same-song', 1, ['x', 'spotify-a'])], selected)).toEqual([
      'spotify-a',
    ])
    expect(buildExportTrackIds([row('playlist-b', 'same-song', 1, ['x', 'spotify-b'])], selected)).toEqual([
      'spotify-b',
    ])
  })
})

describe('buildPlaylistExportJobs', () => {
  test('builds one export payload per playlist using original Melon playlist names', () => {
    const groups = groupPreviewByPlaylist(playlists, [
      row('playlist-a', 'song-1', 1, ['spotify-1']),
      row('playlist-b', 'song-2', 1, ['bad', 'spotify-2']),
    ])
    const selected = {
      [spotifySelectionKey('playlist-b', 'song-2')]: 'spotify-2',
    }

    expect(buildPlaylistExportJobs(groups, selected)).toEqual([
      {
        playlistSeq: 'playlist-a',
        payload: {
          playlist_name: '출근길',
          track_ids: ['spotify-1'],
        },
      },
      {
        playlistSeq: 'playlist-b',
        payload: {
          playlist_name: '운동',
          track_ids: ['spotify-2'],
        },
      },
    ])
  })

  test('skips playlists with no exportable tracks', () => {
    const groups = groupPreviewByPlaylist(playlists, [
      row('playlist-a', 'song-1', 1, []),
      row('playlist-b', 'song-2', 1, ['spotify-2']),
    ])

    expect(buildPlaylistExportJobs(groups, {})).toEqual([
      {
        playlistSeq: 'playlist-b',
        payload: {
          playlist_name: '운동',
          track_ids: ['spotify-2'],
        },
      },
    ])
  })
})

describe('mapExtractResultToMelonTracks', () => {
  const extractResult: ExtractResult = {
    extractedAt: '2026-06-03T00:00:00.000Z',
    playlists: [
      {
        seq: '446121958',
        title: '내 플레이리스트',
        songCount: 2,
        songs: [
          {
            songId: '1644933',
            trackNo: 1,
            title: '언젠가 이곳이',
            artist: '이수',
            artistIds: '261143',
            album: "뮤지컬 대장금 OST '언젠가 이곳이'",
            albumId: '352036',
            likes: '1,234',
            songUrl: 'https://www.melon.com/song/detail.htm?songId=1644933',
          },
          {
            songId: '3801596',
            trackNo: 2,
            title: '돌고 돌아도',
            artist: 'XIA (준수)',
            album: 'Tarantallegra',
          },
        ],
      },
    ],
  }

  test('추출 결과를 서버 요청 필드로 평탄화한다', () => {
    expect(mapExtractResultToMelonTracks(extractResult)).toEqual<MelonTrackRequest[]>([
      {
        playlist_id: '446121958',
        position: 1,
        melon_song_id: '1644933',
        title: '언젠가 이곳이',
        artists_text: '이수',
        melon_artist_ids: '261143',
        album_title: "뮤지컬 대장금 OST '언젠가 이곳이'",
        melon_album_id: '352036',
        melon_likes: 1234,
        melon_song_url: 'https://www.melon.com/song/detail.htm?songId=1644933',
      },
      {
        playlist_id: '446121958',
        position: 2,
        melon_song_id: '3801596',
        title: '돌고 돌아도',
        artists_text: 'XIA (준수)',
        melon_artist_ids: '',
        album_title: 'Tarantallegra',
        melon_album_id: '',
        melon_likes: 0,
        melon_song_url: 'https://www.melon.com/song/detail.htm?songId=3801596',
      },
    ])
  })

  test('artists_text는 세미콜론/콤마 구분자를 콤마 구분 문자열로 정규화한다', () => {
    const mixedArtistResult: ExtractResult = {
      extractedAt: '2026-06-03T00:00:00.000Z',
      playlists: [
        {
          seq: '556969474',
          title: '테스트',
          songCount: 1,
          songs: [
            {
              songId: '1',
              trackNo: 1,
              title: 'One Dream',
              artist: '백현 (BAEKHYUN); 솔지; 소유 (SOYOU), 박규리',
              album: 'One Dream One Korea',
            },
          ],
        },
      ],
    }

    expect(mapExtractResultToMelonTracks(mixedArtistResult)[0].artists_text).toBe(
      '백현 (BAEKHYUN), 솔지, 소유 (SOYOU), 박규리',
    )
  })

  test('여러 플레이리스트를 flat preview 요청으로 변환하되 playlist_id를 보존한다', () => {
    const multiPlaylistResult: ExtractResult = {
      extractedAt: '2026-06-03T00:00:00.000Z',
      playlists: [
        {
          seq: 'playlist-a',
          title: '출근길',
          songCount: 1,
          songs: [
            {
              songId: 'same-song',
              trackNo: 1,
              title: '같은 곡',
              artist: '가수',
              album: '앨범',
            },
          ],
        },
        {
          seq: 'playlist-b',
          title: '운동',
          songCount: 1,
          songs: [
            {
              songId: 'same-song',
              trackNo: 1,
              title: '같은 곡',
              artist: '가수',
              album: '앨범',
            },
          ],
        },
      ],
    }

    expect(mapExtractResultToMelonTracks(multiPlaylistResult).map((track) => ({
      playlist_id: track.playlist_id,
      melon_song_id: track.melon_song_id,
    }))).toEqual([
      { playlist_id: 'playlist-a', melon_song_id: 'same-song' },
      { playlist_id: 'playlist-b', melon_song_id: 'same-song' },
    ])
  })
})
