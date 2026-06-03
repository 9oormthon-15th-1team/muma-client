# 🧩 Muma Client

**CRXJS + React + Vite + TypeScript** 기반 Chrome 확장 프로그램(Manifest V3) 스타터 템플릿입니다.
별도 프레임워크 추상화 없이, 익숙한 Vite + React 개발 경험 그대로 확장 프로그램을 만들 수 있습니다.

> **왜 CRXJS인가?**
> CRXJS는 Plasmo·WXT 같은 "프레임워크"가 아니라 **Vite 플러그인**입니다.
> 런타임 API를 강요하지 않고 번들링과 HMR 문제만 해결해주므로, 학습 비용이 낮고
> 제어권을 100% 개발자가 가집니다. "그냥 Vite + React 프로젝트인데 확장 프로그램으로 빌드된다"가 핵심.

---

## 🚀 빠른 시작

```bash
pnpm install      # 의존성 설치
pnpm dev          # 개발 서버 (HMR 지원)
pnpm build        # 프로덕션 빌드 → dist/
pnpm zip          # 빌드 후 스토어 업로드용 zip 생성
```

### 브라우저에 로드하기

1. `pnpm dev` 또는 `pnpm build` 실행
2. Chrome 주소창에 `chrome://extensions` 입력
3. 우측 상단 **개발자 모드** 토글 ON
4. **압축해제된 확장 프로그램을 로드합니다** 클릭 → `dist/` 폴더 선택
5. 개발 중에는 코드를 저장하면 **HMR로 자동 반영**됩니다 (콘텐츠 스크립트 포함)

---

## 📁 프로젝트 구조

```
muma-client/
├── manifest.config.ts      # ⭐ 확장 프로그램의 심장. MV3 매니페스트를 타입 안전하게 정의
├── vite.config.ts          # CRXJS 플러그인 + React 플러그인 설정
├── tsconfig.json           # TypeScript 설정
├── public/
│   └── icons/              # 확장 프로그램 아이콘 (16/48/128px) — 실제 아이콘으로 교체하세요
└── src/
    ├── popup/              # 🪟 툴바 아이콘 클릭 시 뜨는 팝업 UI (React)
    │   ├── index.html      #    엔트리 HTML
    │   ├── main.tsx        #    React 마운트
    │   ├── App.tsx         #    chrome.storage.local 연동 카운터 예제
    │   └── popup.css
    ├── options/            # ⚙️ 확장 프로그램 설정 페이지 (React)
    │   ├── index.html
    │   ├── main.tsx
    │   ├── App.tsx         #    chrome.storage.sync 연동 설정 저장 예제
    │   └── options.css
    ├── content/            # 🌐 웹페이지에 주입되는 콘텐츠 스크립트
    │   ├── index.tsx       #    Shadow DOM에 React UI 마운트 (스타일 격리)
    │   └── Badge.tsx       #    페이지 우하단 플로팅 배지 예제
    ├── background/         # 🛠️ MV3 서비스 워커 (이벤트 허브)
    │   └── index.ts        #    onInstalled / onMessage 핸들러 예제
    └── vite-env.d.ts       # Vite·Chrome 타입 참조
```

### 핵심 개념 4가지

확장 프로그램은 서로 다른 **실행 컨텍스트**들의 조합입니다. 이 템플릿은 4가지를 모두 포함합니다:

| 컨텍스트 | 위치 | 역할 | DOM 접근 |
|---|---|---|---|
| **Popup** | `src/popup` | 툴바 아이콘 클릭 시 뜨는 UI | 자체 문서 |
| **Options** | `src/options` | 설정 페이지 | 자체 문서 |
| **Content Script** | `src/content` | 방문한 웹페이지에 코드/UI 주입 | 호스트 페이지 |
| **Service Worker** | `src/background` | 백그라운드 이벤트 처리·메시지 라우팅 | ❌ 없음 |

---

## 🔧 새로운 기능 추가하기

### 권한(permission) 추가
`manifest.config.ts`의 `permissions` 배열에 추가합니다.
```ts
permissions: ['storage', 'activeTab', 'tabs'],
```

### 콘텐츠 스크립트 주입 대상 변경
`manifest.config.ts`의 `content_scripts[].matches`를 수정합니다.
```ts
matches: ['https://*.example.com/*'],  // 특정 사이트만
```

### 컨텍스트 간 통신
`chrome.runtime.sendMessage` / `onMessage`로 주고받습니다.
`src/background/index.ts`에 `PING → PONG` 예제가 들어 있습니다.

```ts
// 콘텐츠 스크립트나 팝업에서
const res = await chrome.runtime.sendMessage({ type: 'PING' })
// → { type: 'PONG', at: 1234567890 }
```

---

## 🧱 기술 스택

| 도구 | 버전 | 역할 |
|---|---|---|
| [CRXJS](https://crxjs.dev) | `@crxjs/vite-plugin` v2 (beta) | 매니페스트 처리 · HMR · 번들링 |
| [Vite](https://vitejs.dev) | 6.x | 개발 서버 · 빌드 |
| [React](https://react.dev) | 18.x | UI |
| TypeScript | 5.x | 타입 안전성 |

---

## ⚠️ 알아두면 좋은 점

- **CRXJS v2는 현재 beta**입니다. Vite 5/6 + MV3 조합에서 안정적으로 동작하지만, 프로덕션 도입 시 [릴리스 노트](https://github.com/crxjs/chrome-extension-tools/releases)를 확인하세요.
- **CRXJS는 Chromium 계열(Chrome/Edge) 전용**입니다. Firefox 등 크로스 브라우저가 필요하면 [WXT](https://wxt.dev) 또는 [Plasmo](https://www.plasmo.com)를 검토하세요.
- `public/icons/`의 아이콘은 **플레이스홀더(단색)** 입니다. 실제 브랜드 아이콘으로 교체하세요.
- 서비스 워커는 **DOM에 접근할 수 없습니다.** DOM 작업이 필요하면 콘텐츠 스크립트에서 처리하세요.

---

## 📦 배포

```bash
pnpm zip          # dist/를 묶어 muma-client.zip 생성
```
생성된 zip을 [Chrome 웹 스토어 개발자 대시보드](https://chrome.google.com/webstore/devconsole)에 업로드하세요.
