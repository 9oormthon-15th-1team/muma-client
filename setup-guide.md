# Muma Client 개발 환경 설정 가이드

## 1. 프로젝트 클론 및 의존성 설치

```bash
git pull origin main
pnpm install
```

## 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```
VITE_SPOTIFY_CLIENT_ID=a5aa23ee3d8b4b8b8ef2487495386ece
VITE_API_BASE_URL=http://192.168.0.22:8080
```

> `.env`는 gitignore에 포함되어 있으므로 반드시 로컬에서 직접 생성해야 합니다.

## 3. 빌드

```bash
pnpm build
```

## 4. Chrome 익스텐션 로드

1. `chrome://extensions` 접속
2. 우측 상단 **개발자 모드** ON
3. 기존 Muma Client가 있으면 **삭제**
4. **"압축해제된 확장 프로그램 로드"** → 프로젝트의 `dist` 폴더 선택

## 5. Extension ID 확인

`pnpm dev`로 로컬 개발 서버를 사용할 때 extension ID가 아래와 동일한지 확인:

```
igloofanfognbpellhefnbbaemkpnema
```

> Chrome Web Store 업로드용 `pnpm build`/`pnpm zip` 산출물에는 manifest `key`가 포함되지 않습니다. 스토어 배포 ID는 Chrome Web Store에서 부여됩니다.

## 6. 테스트

- 툴바에서 Muma 아이콘 클릭 → 팝업 표시
- Spotify 로그인 버튼 클릭 → Spotify 동의 화면 → 로그인 성공 확인

### 디버깅

| 로그 | 확인 방법 |
|---|---|
| 팝업 로그 | 팝업 영역 우클릭 → "검사" → Console |
| 서비스 워커 로그 | `chrome://extensions` → Muma Client → "서비스 워커" 링크 클릭 → Console |
