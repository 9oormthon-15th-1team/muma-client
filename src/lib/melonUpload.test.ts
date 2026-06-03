import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ExtractResult, MelonTrackRequest } from './types'
import { exportToSpotify, mapExtractResultToMelonTracks, uploadMelonTracks } from './melonUpload'

const result: ExtractResult = {
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

describe('mapExtractResultToMelonTracks', () => {
  test('추출 결과를 서버 요청 필드로 평탄화한다', () => {
    expect(mapExtractResultToMelonTracks(result)).toEqual<MelonTrackRequest[]>([
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

describe('uploadMelonTracks', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  test('멜론 트랙 배열을 API 클라이언트로 JSON 전송하고 data를 반환한다', async () => {
    const data = [{ melon_song_id: '1', results: [] }]
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 'OK' }, data }),
    })
    vi.stubGlobal('fetch', fetch)
    const tracks = mapExtractResultToMelonTracks(result)

    const response = await uploadMelonTracks(tracks)

    expect(response).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/melon/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tracks),
      signal: expect.any(AbortSignal),
    })
  })

  test('서버가 실패하면 에러를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'server error',
      }),
    )

    await expect(uploadMelonTracks([])).rejects.toThrow('API error 500: server error')
  })

  test('Spotify export는 API 클라이언트로 토큰 헤더와 선택 곡을 전송한다', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 'OK' } }),
    })
    vi.stubGlobal('fetch', fetch)

    await exportToSpotify('spotify-token', {
      playlist_name: 'My Muma Playlist',
      track_ids: ['spotify:track:1', 'spotify:track:2'],
    })

    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/spotify/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Muma-Spotify-Token': 'spotify-token',
      },
      body: JSON.stringify({
        playlist_name: 'My Muma Playlist',
        track_ids: ['spotify:track:1', 'spotify:track:2'],
      }),
      signal: expect.any(AbortSignal),
    })
  })
})
