import { describe, expect, test } from 'vitest'
import { resolveRestoredScreen } from './sessionState'

describe('resolveRestoredScreen', () => {
  test('추출 중(loading)에 닫혔으면 결과 유무에 따라 select/guide로 복원한다', () => {
    expect(resolveRestoredScreen('loading', true, false)).toBe('select')
    expect(resolveRestoredScreen('loading', false, false)).toBe('guide')
  })

  test('매칭 중(matching)에 닫혔으면 preview가 있을 때만 matching을 유지한다', () => {
    // preview가 있으면 기존 화면 전환 effect가 review/app으로 이어서 진행한다
    expect(resolveRestoredScreen('matching', true, true)).toBe('matching')
    // preview가 없으면 매칭 요청이 중단된 것이므로 platform에서 다시 시작
    expect(resolveRestoredScreen('matching', true, false)).toBe('platform')
    expect(resolveRestoredScreen('matching', false, false)).toBe('guide')
  })

  test('select/platform은 추출 결과가 있어야 유지된다', () => {
    expect(resolveRestoredScreen('select', true, false)).toBe('select')
    expect(resolveRestoredScreen('select', false, false)).toBe('guide')
    expect(resolveRestoredScreen('platform', true, false)).toBe('platform')
    expect(resolveRestoredScreen('platform', false, false)).toBe('guide')
  })

  test('review/complete는 preview가 있어야 유지되고, 없으면 남은 데이터 지점으로 되돌린다', () => {
    expect(resolveRestoredScreen('review', true, true)).toBe('review')
    expect(resolveRestoredScreen('review', true, false)).toBe('select')
    expect(resolveRestoredScreen('complete', true, true)).toBe('complete')
    expect(resolveRestoredScreen('complete', false, false)).toBe('guide')
  })

  test('main/guide는 그대로 유지한다', () => {
    expect(resolveRestoredScreen('main', false, false)).toBe('main')
    expect(resolveRestoredScreen('guide', false, false)).toBe('guide')
  })
})
