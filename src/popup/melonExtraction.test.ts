import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExtractResult } from '../lib/types'
import { extractFromMelon, openMelonLogin, openMyMusicPlaylists } from './melonExtraction'

const tabsCreate = vi.fn()
const tabsSendMessage = vi.fn()
const tabsRemove = vi.fn()

const extractResult: ExtractResult = {
  playlists: [{ seq: '1', title: 'playlist-1', songCount: 0, songs: [] }],
  extractedAt: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  tabsCreate.mockReset().mockResolvedValue({ id: 77 })
  tabsSendMessage.mockReset()
  tabsRemove.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('chrome', {
    tabs: { create: tabsCreate, sendMessage: tabsSendMessage, remove: tabsRemove },
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('extractFromMelon', () => {
  it('백그라운드 탭에서 추출하고 결과를 돌려준 뒤 탭을 정리한다', async () => {
    tabsSendMessage.mockResolvedValue({ ok: true, result: extractResult })

    const outcome = await extractFromMelon('12345')

    expect(tabsCreate).toHaveBeenCalledWith({
      url: 'https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm?memberKey=12345',
      active: false,
    })
    expect(tabsSendMessage).toHaveBeenCalledWith(77, { type: 'EXTRACT_ALL', memberKey: '12345' })
    expect(outcome).toEqual({ ok: true, result: extractResult })
    expect(tabsRemove).toHaveBeenCalledWith(77)
  })

  it('콘텐츠 스크립트가 준비될 때까지 재시도한 뒤 추출한다', async () => {
    vi.useFakeTimers()
    tabsSendMessage
      .mockRejectedValueOnce(new Error('Could not establish connection. Receiving end does not exist.'))
      .mockRejectedValueOnce(new Error('Could not establish connection. Receiving end does not exist.'))
      .mockResolvedValue({ ok: true, result: extractResult })

    const pending = extractFromMelon('12345')
    await vi.runAllTimersAsync()
    const outcome = await pending

    expect(tabsSendMessage).toHaveBeenCalledTimes(3)
    expect(outcome).toEqual({ ok: true, result: extractResult })
  })

  it('재시도 한도까지 콘텐츠 스크립트가 응답하지 않으면 PAGE_LOAD_FAILED를 돌려주고 탭을 정리한다', async () => {
    vi.useFakeTimers()
    tabsSendMessage.mockRejectedValue(
      new Error('Could not establish connection. Receiving end does not exist.'),
    )

    const pending = extractFromMelon('12345')
    await vi.runAllTimersAsync()
    const outcome = await pending

    expect(tabsSendMessage).toHaveBeenCalledTimes(26) // 첫 시도 + 재시도 25회
    expect(outcome).toEqual({ ok: false, code: 'PAGE_LOAD_FAILED' })
    expect(tabsRemove).toHaveBeenCalledWith(77)
  })

  it('콘텐츠 스크립트가 보고한 오류를 선언된 에러 코드로 매핑한다', async () => {
    const cases: Array<[string, string]> = [
      ['NOT_LOGGED_IN', 'NOT_LOGGED_IN'],
      ['PLAYLIST_IDS_NOT_FOUND', 'PLAYLIST_NOT_FOUND'],
      ['PLAYLIST_LIST_EMPTY', 'PLAYLIST_NOT_FOUND'],
    ]
    for (const [contentError, expectedCode] of cases) {
      tabsSendMessage.mockResolvedValue({ ok: false, error: contentError })

      const outcome = await extractFromMelon('12345')

      expect(outcome).toEqual({ ok: false, code: expectedCode })
    }

    // 그 외 오류는 원문을 보존한 CONTENT_ERROR
    tabsSendMessage.mockResolvedValue({ ok: false, error: 'HTTP 500' })
    expect(await extractFromMelon('12345')).toEqual({
      ok: false,
      code: 'CONTENT_ERROR',
      message: 'HTTP 500',
    })
  })

  it('백그라운드 탭을 만들지 못하면 TAB_OPEN_FAILED를 돌려준다', async () => {
    tabsCreate.mockResolvedValue({ id: undefined })

    const outcome = await extractFromMelon('12345')

    expect(outcome).toEqual({ ok: false, code: 'TAB_OPEN_FAILED' })
    expect(tabsSendMessage).not.toHaveBeenCalled()
    expect(tabsRemove).not.toHaveBeenCalled()
  })
})

describe('멜론 탭 열기', () => {
  const LIST_URL = 'https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm'

  it('openMelonLogin은 플레이리스트 목록으로 복귀하는 멜론 로그인 페이지를 연다', async () => {
    await openMelonLogin()
    expect(tabsCreate).toHaveBeenCalledWith({
      url: `https://accounts.melon.com/login/login.htm?redirectURL=${encodeURIComponent(LIST_URL)}`,
    })

    await openMelonLogin(true)
    expect(tabsCreate).toHaveBeenLastCalledWith({
      url: `https://accounts.melon.com/login/login.htm?redirectURL=${encodeURIComponent(LIST_URL)}`,
      active: true,
    })
  })

  it('openMyMusicPlaylists는 memberKey가 있으면 쿼리에 실어 연다', async () => {
    await openMyMusicPlaylists('12345')
    expect(tabsCreate).toHaveBeenCalledWith({ url: `${LIST_URL}?memberKey=12345` })

    await openMyMusicPlaylists(null)
    expect(tabsCreate).toHaveBeenLastCalledWith({ url: LIST_URL })
  })
})
