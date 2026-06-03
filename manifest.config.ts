import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// Manifest V3 정의. CRXJS의 defineManifest로 타입 안전하게 작성합니다.
// 엔트리포인트 경로는 src/ 기준 실제 파일을 가리키며, CRXJS가 빌드 시
// 해시된 산출물 경로로 자동 치환해줍니다.
export default defineManifest({
  manifest_version: 3,
  name: 'Muma Client',
  version: pkg.version,
  description: pkg.description,

  // 팝업: 툴바 아이콘 클릭 시 뜨는 UI
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },

  // 옵션 페이지: 확장 프로그램 설정 화면
  options_page: 'src/options/index.html',

  // 백그라운드 서비스 워커 (MV3)
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  // 콘텐츠 스크립트: 매칭되는 웹페이지에 주입
  content_scripts: [
    {
      matches: ['*://*.melon.com/*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],

  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },

  // cookies: 팝업에서 멜론 MLCP 쿠키를 읽어 로그인/ memberKey를 페이지 무관하게 확인
  permissions: ['storage', 'activeTab', 'cookies', 'identity'],
  host_permissions: ['http://192.168.0.22:8080/*', 'https://*.melon.com/*', 'https://accounts.spotify.com/*'],
})
