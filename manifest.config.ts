import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// Manifest V3 정의. CRXJS의 defineManifest로 타입 안전하게 작성합니다.
// 엔트리포인트 경로는 src/ 기준 실제 파일을 가리키며, CRXJS가 빌드 시
// 해시된 산출물 경로로 자동 치환해줍니다.
export default defineManifest({
  manifest_version: 3,
  // 모든 개발 환경에서 동일한 extension ID를 보장하기 위한 고정 키
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4WqdO/4+ku7wX0MkuBxPmIjG4bxdHW1FxGcCj5/EVrOEeS9vJU3IYbrTb9HVoW1k8aSbH72CXqKwkF2UD2yRJKLWWUE3vkQQAqYKGNd4N9Xva2E85BLldJ61rJLuCIUNbPN5EPe4RjAjxJr7gXkUrD2EgWj8sjOUmtaHU09NsrFpjKm6tnrs4TaxAuGIKav+Suj8VjcOo2TmnWOM4CgdIEANSfSaoQm1f4a7P9jcZk/hDeK2eLj38ZTAeb0jKOb9tdOq04YxhLtWA4hjxO4LNd8K6U/Nuy2pR+E6QidS6mxxOh339mVyIWvwObYyaMhLWLTTb5i/HtxqnBFf3FA8rQIDAQAB',
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
