import type { ExtractResult, MelonTrackResult } from '../lib/types'

export type Screen =
  | 'main'
  | 'guide'
  | 'loading'
  | 'select'
  | 'platform'
  | 'matching'
  | 'review'
  | 'complete'
  | 'app'

// 팝업이 닫혀도 유지할 진행 상태. chrome.storage.session에 저장하므로
// 팝업 재오픈 시 복원되고, 브라우저를 종료하면 자동으로 사라진다.
// 진행 중 플래그(loading/uploading)·에러·로그인 상태는 마운트 시 재확인하므로 저장하지 않는다.
export interface PersistedSession {
  screen: Screen
  result: ExtractResult | null
  selectedPlaylists: string[]
  selectedSongs: string[]
  preview: MelonTrackResult[] | null
  selected: Record<string, string>
}

const STORAGE_KEY = 'popup_session_v1'

// 팝업이 닫히면 진행 중이던 비동기 작업(추출/매칭 요청)도 함께 중단된다.
// 따라서 작업 중 화면에서 닫혔다면 데이터가 남은 지점까지만 복원하고,
// 화면이 요구하는 데이터가 없으면 그 데이터를 만들 수 있는 단계로 되돌린다.
export function resolveRestoredScreen(
  screen: Screen,
  hasResult: boolean,
  hasPreview: boolean,
): Screen {
  switch (screen) {
    case 'loading':
      return hasResult ? 'select' : 'guide'
    case 'matching':
      return hasPreview ? 'matching' : hasResult ? 'platform' : 'guide'
    case 'select':
    case 'platform':
      return hasResult ? screen : 'guide'
    case 'review':
    case 'complete':
      return hasPreview ? screen : hasResult ? 'select' : 'guide'
    default:
      return screen
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  const stored = await chrome.storage.session.get(STORAGE_KEY)
  return (stored[STORAGE_KEY] as PersistedSession | undefined) ?? null
}

export async function saveSession(session: PersistedSession): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: session })
}
