import { afterEach, describe, expect, test } from 'vitest'
import { classifyMelonSessionHtml, getMemberKeyFromCookie, memberKeyFromMlcp } from './melonClient'

describe('classifyMelonSessionHtml', () => {
  test('로그인 페이지 신호가 있으면 로그아웃으로 판정한다', () => {
    expect(
      classifyMelonSessionHtml('https://www.melon.com/login.htm', `
        <form id="login_form"></form>
        <div class="member-login">카카오계정 로그인</div>
      `),
    ).toBe('LOGGED_OUT')
  })

  test('마이뮤직 예외 페이지면 로그아웃으로 판정한다', () => {
    expect(
      classifyMelonSessionHtml(
        'https://www.melon.com/mymusic/common/mymusiccommon_exception.htm',
        '<html></html>',
      ),
    ).toBe('LOGGED_OUT')
  })

  test('비로그인 NOTEXIST 예외 페이지("탈퇴한 회원" 문구 포함)도 로그아웃으로 판정한다', () => {
    // 멜론은 비로그인 사용자에게도 NOTEXIST + "탈퇴한 회원입니다." 문구를 내려준다.
    expect(
      classifyMelonSessionHtml(
        'https://www.melon.com/mymusic/common/mymusiccommon_exception.htm?returnType=NOTEXIST',
        '<html><body>탈퇴한 회원입니다.</body></html>',
      ),
    ).toBe('LOGGED_OUT')
  })

  test('로그인/예외 신호가 없으면 로그인으로 판정한다', () => {
    expect(
      classifyMelonSessionHtml('https://www.melon.com/mymusic/playlist/mymusicplaylist_list.htm', `
        <html><body><div id="conts_section">마이뮤직</div></body></html>
      `),
    ).toBe('LOGGED_IN')
  })
})

describe('getMemberKeyFromCookie', () => {
  afterEach(() => {
    document.cookie = 'MLCP=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  test('MLCP 쿠키가 없으면 null (로그아웃)', () => {
    expect(getMemberKeyFromCookie()).toBeNull()
  })

  test('MLCP 쿠키의 Base64 첫 필드(memberKey)를 추출한다', () => {
    // 멜론 MLCP = Base64("memberKey;memberId;memberDjYn;...;cookieLoginType")
    const payload = '57656107;testId;N;;token123;;1700000000000;disp;0;loginId;1'
    document.cookie = `MLCP=${btoa(payload)}; path=/`
    expect(getMemberKeyFromCookie()).toBe('57656107')
  })

  test('memberKey가 숫자가 아니면 null', () => {
    document.cookie = `MLCP=${btoa('notanumber;x')}; path=/`
    expect(getMemberKeyFromCookie()).toBeNull()
  })
})

describe('memberKeyFromMlcp', () => {
  test('빈 값/null이면 null', () => {
    expect(memberKeyFromMlcp(null)).toBeNull()
    expect(memberKeyFromMlcp('')).toBeNull()
  })

  test('Base64 첫 필드 memberKey를 추출한다', () => {
    expect(memberKeyFromMlcp(btoa('57656107;id;N;;tok;;0;disp;0;loginId;1'))).toBe('57656107')
  })

  test('URL 인코딩된 쿠키 값도 디코드한다', () => {
    // chrome.cookies가 percent-encoded 값을 줄 수 있음
    const raw = encodeURIComponent(btoa('12345;id'))
    expect(memberKeyFromMlcp(raw)).toBe('12345')
  })

  test('첫 필드가 숫자가 아니면 null', () => {
    expect(memberKeyFromMlcp(btoa('abc;id'))).toBeNull()
  })
})
