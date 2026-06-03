# 멜론 곡목록 필드 정의 백엔드 핸드오프

## 목적

멜론 플레이리스트 곡목록 HTML 응답을 백엔드 저장 모델/API 응답 필드로 매핑하기 위한 필드 정의 문서다.

대상 응답은 아래 HTML 엔드포인트다.

```http
GET /mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=<seq>
GET /mymusic/playlist/mymusicplaylistview_listPagingSong.htm?plylstSeq=<seq>&startIndex=<n>&pageSize=50
```

응답은 JSON이 아니라 곡 목록 `<table>` HTML이며, 각 곡은 `<tbody><tr>` 1개로 표현된다.

## 권장 저장 단위

저장 단위는 **플레이리스트 곡 항목(playlist track)** 이다.

같은 `melon_song_id`가 여러 플레이리스트에 들어갈 수 있으므로, 곡 자체와 플레이리스트 내 항목을 분리해서 생각해야 한다.

권장 unique key:

```text
playlist_id + melon_song_id
```

순서 변경 이력을 엄밀히 추적해야 한다면 `position`도 함께 고려한다.

## 현재 추출 가능 필드

| 서버 필드명 | 클라이언트 필드명 | 타입 | 필수 | 예시 | 설명 |
|---|---|---:|---:|---|---|
| `playlist_id` | `Playlist.seq` | string | O | `446121958` | 멜론 플레이리스트 ID (`plylstSeq`) |
| `position` | `Song.trackNo` | number | O | `1` | 플레이리스트 내 곡 순서 |
| `melon_song_id` | `Song.songId` | string | O | `1644933` | 멜론 곡 ID |
| `title` | `Song.title` | string | O | `언젠가 이곳이` | 곡명 |
| `artists_text` | `Song.artist` | string | O | `김우형, 안유진` | 표시용 아티스트 문자열 |
| `melon_artist_ids` | `Song.artistIds` | string nullable | N | `225592;261143` | 멜론 아티스트 ID. 여러 개면 `;` 구분 |
| `album_title` | `Song.album` | string nullable | N | `뮤지컬 대장금 OST '언젠가 이곳이'` | 앨범명 |
| `melon_album_id` | `Song.albumId` | string nullable | N | `352036` | 멜론 앨범 ID |
| `melon_likes` | `Song.likes` | number nullable | N | `36` | 멜론 좋아요 수. 쉼표/`총건수` 제거 후 number 변환 권장 |
| `melon_song_url` | `Song.songUrl` | string | O | `https://www.melon.com/song/detail.htm?songId=1644933` | 곡 상세 URL |

## HTML 파싱 출처

| 서버 필드명 | HTML 출처 |
|---|---|
| `playlist_id` | 요청 URL의 `plylstSeq` |
| `position` | 두 번째 셀 또는 `td.no` 텍스트 |
| `melon_song_id` | `input[name="input_check"].value` |
| `title` | `a.btn_icon_detail span.odd_span` → `a.fc_gray` → 체크박스 title 순서로 fallback |
| `artists_text` | 아티스트 셀의 `a.fc_mgray` 텍스트. 여러 앵커면 `; `로 join |
| `melon_artist_ids` | `goArtistDetail('<id>')` 패턴 |
| `album_title` | 앨범 셀의 `a.fc_mgray` 텍스트 |
| `melon_album_id` | `goAlbumDetail('<id>')` 패턴 |
| `melon_likes` | `button.btn_icon.like span.cnt` 텍스트에서 `총건수`, `,` 제거 |
| `melon_song_url` | `melon_song_id` 기반으로 생성 |

## 권장 API 응답 예시

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

## 정규화 권장안

초기 구현은 단일 테이블/문서로 충분하다.

```text
melon_playlist_tracks
```

권장 컬럼:

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `playlist_id` | varchar | `plylstSeq` |
| `position` | integer | 플레이리스트 내 순서 |
| `melon_song_id` | varchar | 멜론 곡 ID |
| `title` | text | 곡명 |
| `artists_text` | text | 표시용 아티스트 |
| `melon_artist_ids` | text nullable | `;` 구분 문자열 |
| `album_title` | text nullable | 앨범명 |
| `melon_album_id` | varchar nullable | 멜론 앨범 ID |
| `melon_likes` | integer nullable | 파싱 실패 시 null |
| `melon_song_url` | text | 곡 상세 URL |
| `extracted_at` | timestamp | 추출 시각 |

권장 인덱스:

```sql
UNIQUE (playlist_id, melon_song_id)
INDEX (melon_song_id)
INDEX (melon_album_id)
```

## 확장 가능 필드

아래 필드는 같은 곡목록 HTML 안에 있지만 현재 클라이언트 `Song` 타입에는 포함하지 않았다.

| 후보 필드 | 권장 서버 필드명 | 타입 | 출처 |
|---|---|---:|---|
| menuId | `melon_menu_id` | string nullable | `playSong('<menuId>', ...)` / `data-song-menuId` |
| 뮤직비디오 유무 | `has_music_video` | boolean nullable | `button.btn_icon.mv` disabled 여부 |
| MV 대상 | `music_video_ref` | string nullable | `goMvDetail('<menuId>','<songId>','song')` |
| 다운로드 가능 여부 | `is_downloadable` | boolean nullable | `button.btn_icon.dl` / `goBuyProduct(...)` |
| 19금 여부 | `is_adult` | boolean nullable | 행 내 adult/`19` 마크 |

## 현재 응답에 없는 필드

아래 데이터는 곡목록 HTML만으로는 안정적으로 얻을 수 없다. 별도 요청이 필요하다.

| 데이터 | 필요 요청 |
|---|---|
| 앨범 커버 이미지 | `mymusicplaylistview_inform.htm` 또는 곡/앨범 상세 |
| 재생 시간 | 곡 상세 또는 앨범 상세 |
| 장르 | 곡 상세 또는 앨범 상세 |
| 발매일 | 곡 상세 또는 앨범 상세 |
| 가사 | 곡 상세 페이지 |
| 재생수 | 현재 곡목록 표에는 없음 |
| 플레이리스트 제목/설명/만든이/커버 | `mymusicplaylistview_inform.htm?plylstSeq=<seq>` |

## 파싱/저장 주의사항

- 멜론 ID들은 숫자처럼 보이지만 문자열로 저장하는 것을 권장한다.
- `melon_likes`는 빈 값이 가능하므로 nullable number로 처리한다.
- 아티스트는 하나의 앵커 안에 콤마로 들어오거나 여러 앵커로 분리될 수 있다.
- 초기에는 `artists_text`와 `melon_artist_ids`를 문자열로 저장하고, 필요 시 별도 artist relation으로 정규화한다.
- HTML 구조 변경 가능성이 있으므로 백엔드 저장 시 `extracted_at`과 원본 추출 버전 정보를 함께 남기는 것이 좋다.
