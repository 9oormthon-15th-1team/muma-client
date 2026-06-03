# 멜론 곡목록 제공 가능 필드 핸드오프

## 목적

멜론 곡목록 HTML 응답에서 백엔드로 전달할 수 있는 **곡 단위 필드 값**만 정의한다.

로그인 상태 확인, 익스텐션 팝업, 세션 처리, 플레이리스트 목록 탐색 로직은 이 문서 범위에서 제외한다.

## 대상 응답

```http
GET /mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=<seq>
GET /mymusic/playlist/mymusicplaylistview_listPagingSong.htm?plylstSeq=<seq>&startIndex=<n>&pageSize=50
```

응답 형식:

```text
HTML table
```

추출 단위:

```text
tbody tr 1개 = 곡 1개
```

## 백엔드 전달 가능 필드

| 필드명 | 타입 | 필수 | 예시 | 설명 |
|---|---:|---:|---|---|
| `playlist_id` | string | O | `446121958` | 요청에 사용한 `plylstSeq` |
| `position` | number | O | `1` | 플레이리스트 내 곡 순서 |
| `melon_song_id` | string | O | `1644933` | 멜론 곡 ID |
| `title` | string | O | `언젠가 이곳이` | 곡명 |
| `artists_text` | string | O | `김우형, 안유진` | 표시용 아티스트명 |
| `melon_artist_ids` | string nullable | N | `225592;261143` | 멜론 아티스트 ID 목록 |
| `album_title` | string nullable | N | `뮤지컬 대장금 OST '언젠가 이곳이'` | 앨범명 |
| `melon_album_id` | string nullable | N | `352036` | 멜론 앨범 ID |
| `melon_likes` | number nullable | N | `36` | 멜론 좋아요 수 |
| `melon_song_url` | string | O | `https://www.melon.com/song/detail.htm?songId=1644933` | 멜론 곡 상세 URL |

## 필드 출처

| 필드명 | HTML 출처 |
|---|---|
| `playlist_id` | 요청 URL의 `plylstSeq` |
| `position` | 곡 행의 두 번째 셀 또는 `td.no` |
| `melon_song_id` | `input[name="input_check"].value` |
| `title` | `a.btn_icon_detail span.odd_span` → `a.fc_gray` → 체크박스 `title` |
| `artists_text` | 아티스트 셀의 `a.fc_mgray` 텍스트 |
| `melon_artist_ids` | `goArtistDetail('<id>')` |
| `album_title` | 앨범 셀의 `a.fc_mgray` 텍스트 |
| `melon_album_id` | `goAlbumDetail('<id>')` |
| `melon_likes` | `button.btn_icon.like span.cnt` |
| `melon_song_url` | `melon_song_id`로 생성 |

## 값 정규화 규칙

| 필드 | 정규화 |
|---|---|
| `playlist_id` | 문자열 그대로 유지 |
| `position` | 숫자로 변환 |
| `melon_song_id` | 문자열 그대로 유지 |
| `title` | NBSP를 일반 공백으로 치환, 연속 공백 축약, trim |
| `artists_text` | 여러 아티스트 앵커는 `; `로 연결 |
| `melon_artist_ids` | 여러 ID는 `;`로 연결 |
| `album_title` | NBSP를 일반 공백으로 치환, 연속 공백 축약, trim |
| `melon_album_id` | 문자열 그대로 유지 |
| `melon_likes` | `총건수` 제거, 쉼표 제거 후 number 변환 |
| `melon_song_url` | `https://www.melon.com/song/detail.htm?songId=<melon_song_id>` |

## 전달 예시

```json
{
  "playlist_id": "446121958",
  "position": 1,
  "melon_song_id": "1644933",
  "title": "언젠가 이곳이",
  "artists_text": "이수",
  "melon_artist_ids": "261143",
  "album_title": "뮤지컬 대장금 OST '언젠가 이곳이'",
  "melon_album_id": "352036",
  "melon_likes": 36,
  "melon_song_url": "https://www.melon.com/song/detail.htm?songId=1644933"
}
```

## 추가로 제공 가능하지만 v1 제외 필드

아래 값은 같은 곡목록 HTML 안에서 추가 추출 가능하지만, v1 기본 전달 필드에서는 제외한다.

| 후보 필드 | 타입 | 출처 |
|---|---:|---|
| `melon_menu_id` | string nullable | `playSong('<menuId>', ...)` |
| `has_music_video` | boolean nullable | `button.btn_icon.mv` disabled 여부 |
| `music_video_ref` | object/string nullable | `goMvDetail(...)` |
| `is_downloadable` | boolean nullable | `button.btn_icon.dl`, `goBuyProduct(...)` |
| `is_adult` | boolean nullable | 행 내 adult/`19` 마크 |

## 제공 불가 필드

아래 값은 곡목록 응답만으로는 제공할 수 없다.

| 필드 | 이유 |
|---|---|
| 앨범 커버 이미지 | 곡목록 table에 없음 |
| 재생 시간 | 곡목록 table에 없음 |
| 장르 | 곡목록 table에 없음 |
| 발매일 | 곡목록 table에 없음 |
| 가사 | 곡목록 table에 없음 |
| 재생수 | 곡목록 table에 없음 |
| 플레이리스트 설명/만든이/커버 | 별도 플레이리스트 정보 응답 필요 |
