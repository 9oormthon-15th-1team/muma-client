# 멜론 곡목록 응답에서 추출 가능한 데이터

> 대상 요청
> - 1페이지: `GET /mymusic/playlist/mymusicplaylistview_listSong.htm?plylstSeq=<seq>`
> - 2페이지~: `GET /mymusic/playlist/mymusicplaylistview_listPagingSong.htm?plylstSeq=<seq>&startIndex=<n>&pageSize=50`
>
> 응답은 곡 목록 `<table>` HTML. 각 곡은 하나의 `<tr>`. 아래 분류는 실제 응답 HTML(plylstSeq=446121958) 기준.

## A. 현재 추출하는 필드 (`Song` 타입)

| 필드 | 예시 값 | 출처(셀렉터/패턴) |
|---|---|---|
| `songId` | `1644933` | `input[name=input_check].value` / `data-song-no` |
| `trackNo` | `1` | `td.no` 텍스트 |
| `title` | 언젠가 이곳이 | `a.btn_icon_detail span.odd_span` → `a.fc_gray` → 체크박스 title (3중 폴백) |
| `artist` | 김우형, 안유진 | `td(아티스트) a.fc_mgray` (여러 개면 `; `로 조인) |
| `artistIds` | `225592` | `goArtistDetail('<id>')` (여러 개면 `;`로 조인) |
| `album` | 뮤지컬 대장금 OST '언젠가 이곳이' | `td(앨범) a.fc_mgray` |
| `albumId` | `352036` | `goAlbumDetail('<id>')` |
| `likes` | `36` | `button.btn_icon.like span.cnt` (`총건수` 제거) |
| `songUrl` | `https://www.melon.com/song/detail.htm?songId=1644933` | songId로 구성 |

## B. 같은 응답에 있지만 아직 추출하지 않는 필드 (확장 가능)

| 데이터 | 예시 | 출처 |
|---|---|---|
| menuId (카테고리 ID) | `75010101` | `playSong('75010101', …)` / `data-song-menuId` |
| 뮤직비디오 유무 | 있음/없음 | `button.btn_icon.mv` 의 `disabled` 여부 |
| MV 링크 대상 | song / 75010101 / 1644933 | `goMvDetail('<menuId>','<songId>','song')` |
| 다운로드(구매) 가능 | 가능 | `button.btn_icon.dl` / `goBuyProduct(...)` |
| 19금(성인) 뱃지 | 해당 곡에만 표시 | 행 내 adult/`19` 마크 |

## C. 이 응답에는 없는 데이터 (다른 요청 필요)

| 데이터 | 어디서 |
|---|---|
| 앨범 커버 이미지(썸네일) | `mymusicplaylistview_inform.htm` 또는 곡/앨범 상세 |
| 재생 시간(길이), 장르, 발매일 | 곡 상세(`goSongDetail`) / 앨범 상세(`goAlbumDetail`) |
| 가사 | 곡 상세 페이지 |
| 재생수(play count) | 이 표엔 좋아요 수만 존재 |
| 플레이리스트 메타(제목·설명·만든이·커버) | `mymusicplaylistview_inform.htm?plylstSeq=<seq>` |

## 비고

- 추출 단위는 **곡(Song)**. 한 번의 곡목록 요청으로 위 A(+선택 시 B)까지 곡 단위로 확보.
- 멜론은 아티스트를 **하나의 앵커 안에 콤마로** 넣기도 하고(`김우형, 안유진`), **여러 앵커로 분리**하기도 한다. 분리형은 `; `로 조인되며, 콤마 포함형은 원문 그대로 유지된다.
- 곡 길이·장르·발매일·가사·커버가 필요하면 곡/앨범 상세를 추가 호출해 보강해야 한다.
