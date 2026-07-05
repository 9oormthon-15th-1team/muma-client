# YouTube OAuth 셋업 가이드 (팀 공용 계정)

멜론 → YouTube Music 이전 기능에 필요한 Google OAuth 클라이언트를 만드는 가이드입니다.
**팀 공용 Google 계정으로 1회만** 진행하면 되고, 발급된 값은 팀원 각자 `.env`에 설정합니다.

> 백엔드도 같은 GCP 프로젝트를 씁니다 (YouTube API 쿼터가 프로젝트 단위이므로).
> 프로젝트 생성 후 백엔드 팀에 접근 권한을 공유하세요.

## 1. 팀 공용 Google 계정 준비

팀 공용 Google 계정을 생성(또는 기존 계정 사용)하고 로그인합니다.

## 2. GCP 프로젝트 생성

1. https://console.cloud.google.com 접속
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 `muma` → 만들기
3. 생성된 프로젝트가 선택돼 있는지 확인

## 3. YouTube Data API v3 활성화

1. 좌측 메뉴 **API 및 서비스 → 라이브러리**
2. "YouTube Data API v3" 검색 → **사용** 클릭

## 4. OAuth 동의 화면 구성

1. **API 및 서비스 → OAuth 동의 화면**
2. User Type: **외부(External)** → 만들기
3. 앱 정보 입력: 앱 이름 `muma`, 지원 이메일 = 팀 공용 계정
4. **범위(Scopes)** 단계에서 **범위 추가** → `https://www.googleapis.com/auth/youtube` 선택
5. **테스트 사용자** 단계에서 팀원 전원 + 데모에 쓸 Google 계정을 이메일로 등록
6. 저장 — 게시 상태는 **테스트(Testing)** 그대로 둡니다

> 테스트 모드 제약:
> - 등록된 테스트 사용자(최대 100명)만 로그인 가능
> - **refresh token이 7일 후 만료**됩니다 → 7일마다 재로그인 필요 (POC 한정 수용)
> - 정식 배포 시에는 Google 심사(앱 인증)가 필요합니다 — YouTube scope는 sensitive 등급

## 5. OAuth 클라이언트 ID 생성

1. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션** (Chrome 확장 프로그램 유형이 아닙니다 — 계정 선택창을 띄우는 launchWebAuthFlow 방식을 쓰기 때문)
3. 이름: `muma-extension`
4. **승인된 리디렉션 URI**에 아래 값을 정확히 추가 (마지막 `/` 포함):

   ```
   https://igloofanfognbpellhefnbbaemkpnema.chromiumapp.org/
   ```

   > 이 주소는 개발용 익스텐션 ID(`setup-guide.md` 5번 참고)로 만들어진 값입니다.
   > 스토어 배포 시 스토어가 부여한 ID로 URI를 추가 등록해야 합니다.

5. 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호(Client Secret)** 를 복사

## 6. .env 설정

프로젝트 루트 `.env`에 추가 (팀 내부 채널로 값 공유 — 공개 레포에 적지 않습니다):

```
VITE_YOUTUBE_CLIENT_ID=<클라이언트 ID>
VITE_YOUTUBE_CLIENT_SECRET=<클라이언트 보안 비밀번호>
```

> Google 웹 클라이언트는 토큰 교환에 client secret을 요구합니다. 익스텐션 번들에 포함되는 값이라
> 기밀로 보호되지는 않지만(installed app 관행), 소스 코드/공개 문서에는 적지 않습니다.

## 7. 백엔드 팀에 프로젝트 공유

1. **IAM 및 관리자 → IAM → 액세스 권한 부여**
2. 백엔드 팀원 이메일 추가, 역할 **편집자(Editor)**

## 8. 동작 확인

`pnpm dev` 또는 빌드 후 익스텐션 로드 → 플랫폼 선택 화면에서 **Youtube music** 선택 →
Google **계정 선택창**이 뜨고, 테스트 사용자로 등록한 계정으로 로그인 → 동의 화면 → 팝업으로 복귀하면 성공.

문제 발생 시 서비스 워커 콘솔(`chrome://extensions` → muma → "서비스 워커")에서 `[youtube-auth]` 로그를 확인하세요.
