import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

// CRXJS가 manifest.config.ts를 읽어 엔트리포인트를 자동으로 번들링하고,
// 개발 모드에서 HMR(Hot Module Replacement)을 제공합니다.
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    // CRXJS HMR을 위한 고정 포트 (콘텐츠 스크립트 HMR 안정화)
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
