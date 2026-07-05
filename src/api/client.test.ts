import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MelonTrackRequest } from '../lib/types'
import {
  exportToSpotify,
  exportToYoutube,
  previewMelonTracks,
  previewYoutubeTracks,
} from './client'

const tracks: MelonTrackRequest[] = [
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
]

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('previewMelonTracks', () => {
  test('멜론 트랙 배열을 JSON 전송하고 매칭 결과(data)를 반환한다', async () => {
    const data = [{ melon_song_id: '1', results: [] }]
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 'OK' }, data }),
    })
    vi.stubGlobal('fetch', fetch)

    const response = await previewMelonTracks(tracks)

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

    await expect(previewMelonTracks([])).rejects.toThrow('API error 500: server error')
  })
})

describe('exportToSpotify', () => {
  test('토큰 헤더와 선택 곡을 전송한다', async () => {
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

describe('previewYoutubeTracks', () => {
  test('멜론 트랙 배열을 JSON 전송하고 YouTube 매칭 결과(data)를 반환한다', async () => {
    const data = [{ melon_song_id: '1', results: [] }]
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 'OK' }, data }),
    })
    vi.stubGlobal('fetch', fetch)

    const response = await previewYoutubeTracks(tracks)

    expect(response).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/youtube/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tracks),
      signal: expect.any(AbortSignal),
    })
  })
})

describe('exportToYoutube', () => {
  test('YouTube 토큰 헤더와 선택 곡을 전송한다', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { code: 'OK' } }),
    })
    vi.stubGlobal('fetch', fetch)

    await exportToYoutube('youtube-token', {
      playlist_name: 'My Muma Playlist',
      video_ids: ['v1', 'v2'],
    })

    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/youtube/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Muma-Youtube-Token': 'youtube-token',
      },
      body: JSON.stringify({
        playlist_name: 'My Muma Playlist',
        video_ids: ['v1', 'v2'],
      }),
      signal: expect.any(AbortSignal),
    })
  })
})
