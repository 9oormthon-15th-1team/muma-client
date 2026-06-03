import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ExtractResult, MelonTrackRequest } from './types'
import { mapExtractResultToMelonTracks, uploadMelonTracks } from './melonUpload'

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
})

describe('uploadMelonTracks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('멜론 트랙 배열을 preview API로 JSON 전송한다', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 'OK' }, data: [] }),
    })
    vi.stubGlobal('fetch', fetch)
    const tracks = mapExtractResultToMelonTracks(result)

    const response = await uploadMelonTracks(tracks)

    expect(response).toEqual({ meta: { code: 'OK' }, data: [] })
    expect(fetch).toHaveBeenCalledWith('http://192.168.0.22:8080/api/melon/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tracks),
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

    await expect(uploadMelonTracks([])).rejects.toThrow('업로드 실패: HTTP 500 server error')
  })
})
