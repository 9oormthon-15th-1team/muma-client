# CRXJS Chrome Extension Tools Architecture

분석 기준은 `crxjs/chrome-extension-tools` 저장소의 `0e35959` 커밋이다.[^repo]

## 한눈에 보는 구조

CRXJS는 Chrome Extension 빌드 문제를 `packages/rollup-plugin`, `packages/vite-plugin`, `packages/vite-plugin-docs`, `playgrounds/*`, `tests/*`로 나눈 pnpm 모노레포다.[^workspace]

```text
chrome-extension-tools
├─ packages
│  ├─ rollup-plugin       # Manifest/HTML을 Rollup 입력과 출력으로 변환
│  ├─ vite-plugin         # Vite dev/build/HMR와 MV3 확장 빌드 통합
│  └─ vite-plugin-docs    # Docusaurus 기반 문서 사이트
├─ playgrounds            # React, Vue, Svelte, Solid, Vanilla 예제 앱
├─ tests                  # Vite 버전 호환성 테스트
└─ schema / design        # manifest schema와 브랜드/디자인 자산
```

루트 `package.json`은 저장소 이름을 `crxjs-monorepo`로 두고 `pnpm@10.11.1`을 패키지 매니저로 지정한다.[^root-package]

루트 스크립트는 Vite 플러그인 빌드, 각 playground 실행, plugin 패키지 릴리스를 상위에서 오케스트레이션한다.[^root-scripts]

워크스페이스는 `packages/**`, `playgrounds/**`, `tests/**`를 포함하고 테스트 내부 패키지는 제외한다.[^workspace]

## 핵심 아키텍처

아키텍처의 중심은 Manifest를 소스 오브 트루스로 읽고, 번들러 입력과 최종 `manifest.json`을 다시 생성하는 흐름이다.[^rollup-manifest-input][^vite-manifest-flow]

`rollup-plugin-chrome-extension`은 Manifest 입력, HTML 입력, 파일명 검증, browser polyfill, mixed format 처리를 하나의 Rollup 플러그인 훅으로 묶는 레이어다.[^rollup-entry]

`@crxjs/vite-plugin`은 Vite 전용 레이어이며, `crx()`가 options, background, content scripts, file writer, HMR, manifest, web accessible resources 플러그인을 배열로 반환한다.[^vite-entry]

Vite 플러그인은 Manifest V3만 허용하고, dev server가 manifest entry 파일을 사전 번들링 대상으로 보도록 `optimizeDeps.entries`를 확장한다.[^vite-manifest-init]

Vite 빌드 모드에서는 content script, background, HTML 파일을 Rollup chunk로 emit하고, 최종 단계에서 ref id를 실제 파일명으로 바꾼다.[^vite-build-emit][^vite-build-filenames]

Vite serve 모드에서는 HTML과 service worker를 dev server와 loader로 처리하고, content script는 loader 파일명으로 Manifest에 반영한다.[^vite-serve-emit][^vite-serve-filenames]

## 데이터 흐름

Manifest 입력은 `cosmiconfig`로 읽히며 TypeScript manifest 파일은 `esbuild-runner/register`로 로드된다.[^manifest-loader]

Rollup 레이어는 package metadata, `extendManifest`, 기본 MV2 값, manifest 파일 내용을 합쳐 `fullManifest`를 만든다.[^manifest-compose]

Rollup 레이어는 `deriveFiles()`로 manifest 안의 JS, HTML, CSS, 이미지, 기타 자산, content script 목록을 추출한다.[^manifest-derive]

Rollup 레이어는 추출된 JS와 HTML을 Rollup input으로 만들고 스크립트가 없는 CSS-only 확장에는 stub input을 넣는다.[^manifest-inputs]

Vite 레이어는 Manifest를 encoded virtual module로 emit한 뒤 `transformCrxManifest`와 `renderCrxManifest` 커스텀 훅을 통해 다른 CRX 플러그인이 Manifest를 변경할 수 있게 한다.[^vite-manifest-loader][^vite-transform-hook]

Vite 레이어는 최종 `generateBundle`에서 manifest asset을 만들거나 덮어쓰고 임시 manifest JS chunk를 제거한다.[^vite-manifest-output]

## 개발 모드 처리

개발 모드의 핵심은 Vite dev server 산출물을 확장 프로그램 dist 폴더에 계속 써 주는 file writer다.[^file-writer]

`pluginFileWriter`는 Vite HTTP 서버의 `listening` 이벤트에서 file writer를 시작하고 `close` 이벤트에서 종료한다.[^plugin-file-writer]

file writer는 CRX 플러그인만 골라 내부 Rollup 빌드를 실행하고 manifest, loader, public folder 기반 파일을 outDir에 쓴다.[^file-writer]

content script 개발 모드는 content script 변경 스트림을 구독해 Vite client, React preamble, 실제 모듈, loader asset을 함께 생성한다.[^content-serve]

background 개발 모드는 service worker loader를 확장 루트에 두고 `/@vite/env`, worker HMR client, 실제 worker를 localhost dev server에서 import하게 만든다.[^background-comment][^background-loader]

HMR 플러그인은 Vite websocket send를 감싸 일반 HMR payload를 유지하면서 CRX 전용 content script payload와 runtime reload payload를 추가한다.[^hmr-send]

HMR 플러그인은 background dependency 변경 시 extension runtime reload를 보내고 content script dependency 변경 시 file writer update를 호출한다.[^hmr-update]

## 빌드 모드 처리

content script 빌드 모드는 Rollup entry signature를 `exports-only`로 유지해 content script module API의 export를 보존한다.[^content-build-config]

content script 빌드 모드는 script chunk가 imports, dynamicImports, exports를 가지면 loader asset을 만들고 단순 chunk이면 즉시 실행 함수로 감싼다.[^content-build-output]

web accessible resources 플러그인은 빌드 시 Vite manifest를 강제로 만들고 content script chunk의 assets, css, imports를 계산한다.[^war-config][^war-derive]

web accessible resources 플러그인은 중복 resource rule을 match/use_dynamic_url 기준으로 합치고 Firefox에서는 `use_dynamic_url`을 제거한다.[^war-combine]

개발 모드의 web accessible resources는 `<all_urls>`에 `**/*`와 `*`를 열어 dev server 산출물 접근 문제를 단순화한다.[^war-serve]

## 실제 개발 폴더 구조

CRXJS 앱은 Manifest에 등록되는 실행 지점을 기준으로 `popup`, `options`, `content`, `background`를 분리하는 구조가 가장 이해하기 쉽다.[^vite-manifest-flow]

```text
.
├─ manifest.config.ts
├─ vite.config.ts
├─ public
│  └─ icons
└─ src
   ├─ background
   │  ├─ index.ts
   │  ├─ alarms.ts
   │  ├─ messages.ts
   │  └─ storage.ts
   ├─ content
   │  ├─ index.tsx
   │  ├─ App.tsx
   │  ├─ injectRoot.ts
   │  └─ styles.css
   ├─ popup
   │  ├─ index.html
   │  ├─ main.tsx
   │  ├─ App.tsx
   │  └─ popup.css
   ├─ options
   │  ├─ index.html
   │  ├─ main.tsx
   │  ├─ App.tsx
   │  └─ options.css
   ├─ shared
   │  ├─ api
   │  ├─ chrome
   │  ├─ components
   │  ├─ constants
   │  ├─ hooks
   │  ├─ messages
   │  ├─ storage
   │  └─ types
   └─ assets
      └─ images
```

`manifest.config.ts`는 확장 프로그램의 entrypoint registry로 두고, `action.default_popup`, `options_page`, `background.service_worker`, `content_scripts[].js`에는 실제 `src/*` 파일만 연결하는 것이 좋다.[^vite-manifest-init][^vite-build-emit]

`src/background`는 MV3 service worker 코드만 두는 영역이며, DOM이나 React UI 의존성을 넣지 않는 것이 안전하다.[^background-comment][^background-loader]

`src/content`는 웹페이지에 주입되는 코드만 두는 영역이며, 페이지 DOM에 붙일 root 생성, content UI, content 전용 CSS를 함께 둔다.[^content-serve][^content-build-output]

`src/popup`과 `src/options`는 각각 독립 HTML entry를 갖는 작은 React 앱으로 두는 것이 좋다.[^vite-build-emit]

`src/shared`는 background, content, popup, options가 함께 쓰는 타입, 메시지 프로토콜, storage wrapper, chrome API wrapper, 공통 UI만 둔다.[^vite-entry]

`src/shared/messages`에는 runtime message의 request/response 타입과 action 이름을 모아 두는 것이 좋고, 이렇게 하면 background와 content 사이 통신 계약이 흩어지지 않는다.[^hmr-update]

`src/shared/storage`에는 `chrome.storage` 접근 코드를 모아 두는 것이 좋고, 이렇게 하면 popup/options/content/background가 같은 저장소 키를 다르게 해석하는 문제를 줄일 수 있다.[^vite-entry]

`public`에는 icon처럼 manifest에서 정적 경로로 참조하는 파일을 두고, 코드에서 import되어 번들링될 이미지는 `src/assets`에 두는 것이 좋다.[^vite-manifest-output][^war-derive]

## 규모가 커질 때의 확장 구조

기능이 작을 때는 entrypoint별 구조만으로 충분하지만, 기능이 많아지면 `src/features/*`를 추가해 비즈니스 로직을 기능 단위로 묶는 편이 좋다.[^vite-entry]

```text
src
├─ background
├─ content
├─ popup
├─ options
├─ features
│  ├─ auth
│  ├─ capture
│  ├─ sync
│  └─ user-settings
└─ shared
```

`features/*`는 화면이나 실행 위치가 아니라 제품 기능을 기준으로 나누고, entrypoint 폴더는 해당 기능을 호출하는 얇은 adapter 역할로 유지하는 것이 좋다.[^vite-entry]

background에서만 실행되어야 하는 코드는 `features/*`에 직접 섞기보다 `background` adapter를 통해 호출하는 것이 좋고, 이는 service worker와 DOM 실행 환경이 다르기 때문이다.[^background-comment]

content script에서만 필요한 DOM 조작 코드는 `content`에 두고, 순수 계산이나 API 호출처럼 실행 환경에 독립적인 코드는 `features` 또는 `shared`로 올리는 것이 좋다.[^content-serve]

공통 컴포넌트는 `shared/components`에 두되 popup/options에서만 쓰는 레이아웃 컴포넌트는 각 entrypoint 폴더 안에 남기는 것이 좋다.[^vite-build-emit]

## 현재 프로젝트에 적용하면

현재 프로젝트는 `src/background/index.ts`, `src/content/index.tsx`, `src/popup/index.html`, `src/options/index.html`을 이미 entrypoint별로 나누고 있으므로 기본 방향은 적절하다.[^vite-manifest-init]

다음 단계로는 `src/shared/messages`, `src/shared/storage`, `src/shared/types`를 만들고 background/content/popup/options 사이에서 공유되는 계약을 그쪽으로 옮기는 것이 좋다.[^vite-entry]

content UI가 커지면 `src/content/Badge.tsx` 옆에 `App.tsx`, `injectRoot.ts`, `content.css`를 두어 주입 로직과 UI를 분리하는 것이 좋다.[^content-serve]

popup과 options에 중복되는 React 컴포넌트나 hook이 생기면 각 폴더에서 복사하지 말고 `src/shared/components` 또는 `src/shared/hooks`로 올리는 것이 좋다.[^vite-entry]

## 패키지별 역할

`packages/rollup-plugin`은 `main`, `module`, `types`를 제공하는 `rollup-plugin-chrome-extension` 패키지다.[^rollup-package]

`packages/rollup-plugin`은 Jest 기반 테스트와 MV2/MV3 CI 스크립트를 가진다.[^rollup-tests]

`packages/vite-plugin`은 ESM/CJS export를 함께 제공하는 `@crxjs/vite-plugin` 패키지다.[^vite-package]

`packages/vite-plugin`은 Vite `^3`부터 `^8`까지를 peer dependency로 열어 둔다.[^vite-peer]

`packages/vite-plugin-docs`는 Docusaurus build, serve, deploy 스크립트를 가진 문서 사이트 패키지다.[^docs-package]

`tests/vite-compat`는 `@crxjs/vite-plugin`을 workspace dependency로 주입하고 Vite 호환성 테스트를 실행하는 별도 테스트 패키지다.[^vite-compat]

## 테스트와 예제 구조

Vite 플러그인 테스트는 `tests/e2e`와 `tests/out` 아래에 React, Vue, Svelte, vanilla, HMR, dynamic script, web accessible resources 같은 시나리오별 fixture를 둔다.[^vite-tests]

Rollup 플러그인 fixture는 MV2와 MV3의 basic, content script, browser polyfill, external dependency, locales, options UI, kitchen sink 같은 케이스를 나눠 둔다.[^rollup-fixtures]

playground 스크립트는 React, Solid, Svelte, Vanilla, Vue 예제 앱을 루트에서 실행할 수 있게 연결한다.[^root-scripts]

## 요약

CRXJS의 구조는 Rollup 기반 Manifest 변환 엔진 위에 Vite 전용 dev server, HMR, MV3 처리 레이어를 얹은 형태로 이해할 수 있다.[^rollup-entry][^vite-entry]

CRXJS의 가장 중요한 경계는 Manifest 파싱과 입력 추론은 `manifest-input`이 맡고, Vite 개발 경험과 최종 Manifest 재작성은 `vite-plugin/src/node/*`의 CRX 플러그인들이 분담한다는 점이다.[^rollup-manifest-input][^vite-manifest-flow]

## 근거 목록

[^repo]: https://github.com/crxjs/chrome-extension-tools/tree/0e35959
[^workspace]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/pnpm-workspace.yaml#L1-L14
[^root-package]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/package.json#L1-L4
[^root-scripts]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/package.json#L17-L26
[^rollup-entry]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/src/index.ts#L1-L113
[^vite-entry]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/index.ts#L20-L41
[^rollup-manifest-input]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/src/manifest-input/index.ts#L147-L262
[^vite-manifest-flow]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L183-L360
[^vite-manifest-init]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L44-L89
[^vite-build-emit]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L254-L305
[^vite-build-filenames]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L347-L360
[^vite-serve-emit]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L203-L253
[^vite-serve-filenames]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L318-L345
[^manifest-loader]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/src/manifest-input/index.ts#L29-L40
[^manifest-compose]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/src/manifest-input/index.ts#L177-L197
[^manifest-derive]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/src/manifest-input/index.ts#L199-L232
[^manifest-inputs]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/src/manifest-input/index.ts#L250-L262
[^vite-manifest-loader]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L104-L124
[^vite-transform-hook]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L183-L199
[^vite-manifest-output]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-manifest.ts#L311-L360
[^file-writer]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/fileWriter.ts#L30-L69
[^plugin-file-writer]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-fileWriter.ts#L29-L45
[^content-serve]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-contentScripts.ts#L80-L134
[^background-comment]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-background.ts#L10-L23
[^background-loader]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-background.ts#L68-L123
[^hmr-send]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-hmr.ts#L60-L90
[^hmr-update]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-hmr.ts#L95-L181
[^content-build-config]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-contentScripts.ts#L158-L178
[^content-build-output]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-contentScripts.ts#L179-L230
[^war-config]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-webAccessibleResources.ts#L73-L123
[^war-derive]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-webAccessibleResources.ts#L139-L189
[^war-combine]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-webAccessibleResources.ts#L200-L230
[^war-serve]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/src/node/plugin-webAccessibleResources.ts#L31-L70
[^rollup-package]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/package.json#L1-L20
[^rollup-tests]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/rollup-plugin/package.json#L25-L39
[^vite-package]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/package.json#L1-L39
[^vite-peer]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin/package.json#L112-L114
[^docs-package]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/packages/vite-plugin-docs/package.json#L1-L17
[^vite-compat]: https://github.com/crxjs/chrome-extension-tools/blob/0e35959/tests/vite-compat/package.json#L1-L24
[^vite-tests]: https://github.com/crxjs/chrome-extension-tools/tree/0e35959/packages/vite-plugin/tests
[^rollup-fixtures]: https://github.com/crxjs/chrome-extension-tools/tree/0e35959/packages/rollup-plugin/__fixtures__/extensions
