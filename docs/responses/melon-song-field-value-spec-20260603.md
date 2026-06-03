# 멜론 곡목록 필드 값 명세

## 대상 응답

```http
GET /mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=<seq>
GET /mymusic/playlist/mymusicplaylistview_listPagingSong.htm?plylstSeq=<seq>&startIndex=<n>&pageSize=50
```

응답은 곡 목록 `<table>` HTML이며, 각 곡은 `<tbody><tr>` 1개로 표현된다.

## 현재 추출 필드 값 명세

| 필드 | 값 의미 | 타입 | 필수 | 정규화 규칙 | 빈 값 처리 | 예시 |
|---|---|---:|---:|---|---|---|
| `songId` | 멜론 곡 고유 ID | string | O | 숫자 문자열 그대로 유지 | 행 제외 권장 | `1644933` |
| `trackNo` | 플레이리스트 내 표시 순서 | number | O | 숫자 파싱 | 파싱 실패 시 `0` 또는 null 정책 필요 | `1` |
| `title` | 곡명 | string | O | NBSP를 일반 공백으로 치환, 연속 공백 축약, trim | fallback 후에도 없으면 빈 문자열 | `언젠가 이곳이` |
| `artist` | 표시용 아티스트명 | string | O | 여러 앵커면 `; `로 join, 단일 앵커 내 콤마는 원문 유지 | 없으면 빈 문자열 | `김우형, 안유진` |
| `artistIds` | 멜론 아티스트 ID 목록 | string | N | 여러 개면 `;`로 join | 없으면 빈 문자열 또는 null | `225592;261143` |
| `album` | 앨범명 | string | N | NBSP 치환, 공백 축약, trim | 없으면 빈 문자열 또는 null | `뮤지컬 대장금 OST '언젠가 이곳이'` |
| `albumId` | 멜론 앨범 고유 ID | string | N | 숫자 문자열 그대로 유지 | 없으면 빈 문자열 또는 null | `352036` |
| `likes` | 멜론 좋아요 수 | string 또는 number | N | `총건수` 제거, 쉼표 제거 | 없으면 빈 문자열 또는 null | `36` |
| `songUrl` | 멜론 곡 상세 URL | string | O | `songId`로 생성 | `songId` 없으면 생성하지 않음 | `https://www.melon.com/song/detail.htm?songId=1644933` |

## 필드별 상세 명세

### `songId`

- 멜론 곡을 식별하는 가장 중요한 키다.
- HTML 출처:

```html
<input name="input_check" value="1644933" />
```

- 숫자처럼 보이지만 백엔드에서는 string 저장을 권장한다.
- `songId`가 없는 `<tr>`은 곡 행이 아니므로 파싱 대상에서 제외한다.

### `trackNo`

- 플레이리스트 화면에 표시되는 곡 순서다.
- HTML 출처:

```html
<td class="no">1</td>
```

- 페이징 요청에서는 페이지별 순서가 아니라 전체 플레이리스트 순서로 내려오는지 확인 필요하다.
- 현재 클라이언트는 파싱 실패 시 `0`을 사용한다.
- 백엔드 저장 시에는 `0`보다 `null`이 더 명확할 수 있다.

### `title`

- 곡명이다.
- 추출 우선순위:

```text
1. a.btn_icon_detail span.odd_span
2. a.fc_gray
3. input[name=input_check].title 에서 "곡 선택" 제거
```

- 공백 정규화:

```text
\u00a0 -> 일반 공백
연속 공백 -> 단일 공백
앞뒤 공백 제거
```

### `artist`

- UI 표시용 아티스트 문자열이다.
- 아티스트가 여러 앵커로 나뉘면 `; `로 합친다.
- 멜론이 하나의 앵커 안에 `김우형, 안유진`처럼 콤마 포함 문자열을 넣는 경우는 원문을 유지한다.
- 이 필드는 정규화된 아티스트 relation이 아니라 표시 문자열이다.

### `artistIds`

- `goArtistDetail('<id>')`에서 추출한 멜론 아티스트 ID다.
- 여러 아티스트면 `;`로 합친다.
- 예:

```text
225592;261143
```

- 백엔드에서 정규화할 경우 문자열 그대로 저장하기보다 배열 또는 별도 relation으로 분리하는 것이 좋다.

### `album`

- 앨범 표시명이다.
- HTML 출처:

```html
<a class="fc_mgray">뮤지컬 대장금 OST '언젠가 이곳이'</a>
```

- 공백 정규화는 `title`과 동일하다.

### `albumId`

- `goAlbumDetail('<id>')`에서 추출한 멜론 앨범 ID다.
- 숫자처럼 보이지만 string 저장을 권장한다.

### `likes`

- 곡 좋아요 수다.
- HTML 출처:

```html
<button class="btn_icon like">
  <span class="cnt">총건수 1,234</span>
</button>
```

- 정규화:

```text
"총건수 1,234" -> "1234"
```

- 백엔드에서는 number nullable로 저장하는 것을 권장한다.
- 값이 비어 있거나 파싱 실패하면 null 처리한다.

### `songUrl`

- `songId`로 생성하는 파생 필드다.
- 형식:

```text
https://www.melon.com/song/detail.htm?songId=<songId>
```

- 원본 HTML에서 직접 읽는 값이 아니라 클라이언트/서버에서 생성 가능하다.

## 확장 가능 필드 값 명세

| 후보 필드 | 값 의미 | 권장 타입 | 출처 | 비고 |
|---|---|---:|---|---|
| `menuId` | 멜론 내부 메뉴/카테고리 ID | string nullable | `playSong('75010101', songId)` | 곡 상세 요청 보조값으로 쓸 수 있음 |
| `hasMusicVideo` | 뮤직비디오 존재 여부 | boolean nullable | `button.btn_icon.mv` disabled 여부 | disabled면 false |
| `musicVideoRef` | MV 상세 이동 인자 | object/string nullable | `goMvDetail(menuId, songId, 'song')` | 구조화 저장 권장 |
| `isDownloadable` | 다운로드/구매 가능 여부 | boolean nullable | `button.btn_icon.dl`, `goBuyProduct(...)` | UI 버튼 기준 |
| `isAdult` | 19금 곡 여부 | boolean nullable | 행 내 adult/`19` 마크 | 정확한 셀렉터 추가 확인 필요 |

## 곡목록 응답에 없는 값

| 값 | 곡목록 응답 내 존재 여부 | 확보 방법 |
|---|---:|---|
| 앨범 커버 이미지 | 없음 | 플레이리스트 정보 또는 곡/앨범 상세 요청 |
| 재생 시간 | 없음 | 곡 상세 또는 앨범 상세 요청 |
| 장르 | 없음 | 곡 상세 또는 앨범 상세 요청 |
| 발매일 | 없음 | 앨범 상세 요청 |
| 가사 | 없음 | 곡 상세 요청 |
| 재생수 | 없음 | 별도 제공 여부 확인 필요 |
| 플레이리스트 제목/설명/만든이/커버 | 없음 | `mymusicplaylistview_inform.htm?plylstSeq=<seq>` |

## 백엔드 저장 권장 원칙

- 멜론 ID 계열은 모두 string으로 저장한다.
- 숫자 통계값인 `likes`만 number nullable로 변환한다.
- 표시 문자열(`artist`, `album`, `title`)은 HTML 정규화 후 저장한다.
- 여러 아티스트 ID는 초기에는 `;` 구분 문자열로 저장 가능하지만, 장기적으로는 relation 또는 array가 적합하다.
- `songUrl`은 저장해도 되지만 `songId`에서 재생성 가능하므로 파생 필드로 취급한다.
