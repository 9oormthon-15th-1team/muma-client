import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSpotifyStatus,
  getYoutubeStatus,
  requestSpotifyExport,
  requestYoutubeExport,
  spotifyLogin,
  spotifyLogout,
  youtubeLogin,
  youtubeLogout,
} from './backgroundMessages'

const sendMessage = vi.fn()

beforeEach(() => {
  sendMessage.mockReset()
  vi.stubGlobal('chrome', { runtime: { sendMessage } })
})

describe('backgroundMessages', () => {
  it('getSpotifyStatus는 SPOTIFY_STATUS를 보내고 로그인 여부 응답을 돌려준다', async () => {
    sendMessage.mockResolvedValue({ loggedIn: true })

    const res = await getSpotifyStatus()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'SPOTIFY_STATUS' })
    expect(res).toEqual({ loggedIn: true })
  })

  it('spotifyLogin은 SPOTIFY_LOGIN을 보내고 토큰 응답을 돌려준다', async () => {
    sendMessage.mockResolvedValue({ success: true, accessToken: 'token-1' })

    const res = await spotifyLogin()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'SPOTIFY_LOGIN' })
    expect(res).toEqual({ success: true, accessToken: 'token-1' })
  })

  it('spotifyLogout은 SPOTIFY_LOGOUT을 보내고 성공 여부를 돌려준다', async () => {
    sendMessage.mockResolvedValue({ success: true })

    const res = await spotifyLogout()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'SPOTIFY_LOGOUT' })
    expect(res).toEqual({ success: true })
  })

  it('requestSpotifyExport는 EXPORT_TO_SPOTIFY에 페이로드를 실어 보내고 결과를 돌려준다', async () => {
    sendMessage.mockResolvedValue({ ok: false, error: 'Spotify API 오류' })
    const payload = { playlist_name: 'My Playlist', track_ids: ['t1', 't2'] }

    const res = await requestSpotifyExport(payload)

    expect(sendMessage).toHaveBeenCalledWith({ type: 'EXPORT_TO_SPOTIFY', payload })
    expect(res).toEqual({ ok: false, error: 'Spotify API 오류' })
  })

  it('getYoutubeStatus는 YOUTUBE_STATUS를 보내고 로그인 여부 응답을 돌려준다', async () => {
    sendMessage.mockResolvedValue({ loggedIn: true })

    const res = await getYoutubeStatus()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'YOUTUBE_STATUS' })
    expect(res).toEqual({ loggedIn: true })
  })

  it('youtubeLogin은 YOUTUBE_LOGIN을 보내고 토큰 응답을 돌려준다', async () => {
    sendMessage.mockResolvedValue({ success: true, accessToken: 'yt-token-1' })

    const res = await youtubeLogin()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'YOUTUBE_LOGIN' })
    expect(res).toEqual({ success: true, accessToken: 'yt-token-1' })
  })

  it('youtubeLogout은 YOUTUBE_LOGOUT을 보내고 성공 여부를 돌려준다', async () => {
    sendMessage.mockResolvedValue({ success: true })

    const res = await youtubeLogout()

    expect(sendMessage).toHaveBeenCalledWith({ type: 'YOUTUBE_LOGOUT' })
    expect(res).toEqual({ success: true })
  })

  it('requestYoutubeExport는 EXPORT_TO_YOUTUBE에 페이로드를 실어 보내고 결과를 돌려준다', async () => {
    sendMessage.mockResolvedValue({ ok: true })
    const payload = { playlist_name: 'My Playlist', video_ids: ['v1', 'v2'] }

    const res = await requestYoutubeExport(payload)

    expect(sendMessage).toHaveBeenCalledWith({ type: 'EXPORT_TO_YOUTUBE', payload })
    expect(res).toEqual({ ok: true })
  })
})
