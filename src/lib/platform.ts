import type { TargetPlatform } from './types'

/** 화면 문구에 쓰는 플랫폼 표시명 */
export const PLATFORM_LABELS: Record<TargetPlatform, string> = {
  spotify: 'Spotify',
  ytmusic: 'Youtube Music',
}

/** 완료 화면 "이동하기" 버튼이 여는 플랫폼 홈 URL */
export const PLATFORM_HOME_URLS: Record<TargetPlatform, string> = {
  spotify: 'https://open.spotify.com',
  ytmusic: 'https://music.youtube.com',
}
