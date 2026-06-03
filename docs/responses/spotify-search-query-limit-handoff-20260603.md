# Spotify Search Query 250자 제한 오류 핸드오프

## 요약

멜론 익스텐션에서 `/api/melon/preview`로 데이터 전송은 성공했지만, 백엔드가 Spotify Search API를 호출하는 과정에서 400 오류가 발생했다.

실패 원인은 Spotify Search API의 `q` 파라미터가 250자를 초과했기 때문이다.

## 발생 위치

클라이언트 요청:

```http
POST http://192.168.0.22:8080/api/melon/preview
Content-Type: application/json
```

백엔드 내부 호출:

```http
GET https://api.spotify.com/v1/search
  ?q=track:<곡명> artist:<아티스트 전체 문자열>
  &type=track
  &market=KR
  &limit=2
```

실패 stack trace 기준 위치:

```text
com.muma.melon.MelonService.searchTopTracks(MelonService.kt:33)
com.muma.melon.MelonService.preview(MelonService.kt:15)
com.muma.melon.MelonController.preview(MelonController.kt:18)
```

## Spotify 오류

Spotify 응답:

```json
{
  "error": {
    "status": 400,
    "message": "Query exceeds maximum length of 250 characters"
  }
}
```

백엔드 최종 응답:

```http
500 Internal Server Error
```

## 원인

백엔드가 멜론의 `artists_text` 전체 값을 Spotify search query의 `artist:` 조건에 그대로 넣고 있다.

문제가 된 예:

```text
track:One Dream One Korea (Original Ver.) artist:백현 (BAEKHYUN); 솔지; 소유 (SOYOU); 박규리 (카라); 핫펠트 (HA:TFELT); ...
```

참여 아티스트가 많은 곡에서는 `track:<title> artist:<artists_text>` 전체 길이가 Spotify 제한인 250자를 초과한다.

## 책임 경계

이 오류는 클라이언트 전송 실패가 아니다.

정상 처리된 단계:

```text
익스텐션 → 백엔드 /api/melon/preview 요청 성공
백엔드 컨트롤러 진입 성공
백엔드 MelonService.preview 실행
```

실패한 단계:

```text
백엔드 → Spotify Search API 호출
```

따라서 근본 수정 위치는 백엔드의 Spotify search query 생성 로직이다.

## 서버 수정 권장안

### 1. 검색 쿼리 길이 제한

Spotify 호출 전 `q` 길이를 250자 이하로 제한해야 한다.

권장 상한:

```text
q.length <= 250
```

안전하게는 URL 인코딩 전 원본 문자열 기준 240자 이하로 자르는 것을 권장한다.

### 2. 아티스트 문자열 축약

`artists_text` 전체를 사용하지 말고 첫 번째 아티스트만 우선 사용한다.

예:

```text
백현 (BAEKHYUN); 솔지; 소유 (SOYOU)
```

검색 쿼리:

```text
track:One Dream One Korea (Original Ver.) artist:백현 (BAEKHYUN)
```

분리 기준:

```text
;
```

### 3. fallback 검색 전략

Spotify search가 400 또는 결과 없음이면 단계적으로 검색 조건을 줄인다.

권장 순서:

```text
1. track:<title> artist:<first_artist>
2. track:<title>
3. <title>
```

### 4. 외부 API 오류를 500으로 전파하지 않기

Spotify 400은 서버 내부 장애가 아니라 특정 곡 검색 실패로 처리하는 것이 적절하다.

권장 응답:

```json
{
  "playlist_id": "...",
  "melon_song_id": "...",
  "title": "...",
  "artists_text": "...",
  "results": [],
  "error": {
    "code": "SPOTIFY_QUERY_TOO_LONG",
    "message": "Spotify search query exceeded 250 characters"
  }
}
```

곡 하나가 실패해도 전체 `/api/melon/preview` 요청은 계속 처리하는 것이 좋다.

## 예시 수정 로직

```kotlin
fun buildSpotifyQuery(title: String, artistsText: String): String {
    val firstArtist = artistsText
        .split(";")
        .map { it.trim() }
        .firstOrNull { it.isNotBlank() }

    val candidates = listOfNotNull(
        firstArtist?.let { "track:$title artist:$it" },
        "track:$title",
        title
    )

    return candidates.first { it.length <= 250 }
}
```

보다 안전하게 하려면 모든 후보가 250자를 초과할 때 title도 잘라야 한다.

```kotlin
fun limitQuery(query: String): String =
    query.take(240)
```

## 클라이언트 임시 완화 가능성

클라이언트에서 `artists_text`를 첫 번째 아티스트만 보내면 이 오류를 줄일 수 있다.

하지만 권장하지 않는다.

이유:

- 멜론 원본 데이터 손실
- 서버 검색 정책을 클라이언트가 대신 알게 됨
- Spotify 제한은 서버의 외부 API 연동 책임

따라서 클라이언트는 원본 `artists_text`를 유지하고, 백엔드가 Spotify 검색용 query를 별도로 안전하게 생성하는 구조가 적절하다.

## 결론

수정 대상은 백엔드다.

핵심 변경:

- `artists_text` 전체를 Spotify `artist:` query에 넣지 않는다.
- 첫 번째 아티스트 우선 검색으로 줄인다.
- `q` 길이를 250자 이하로 보장한다.
- Spotify 400을 전체 API 500으로 전파하지 않는다.
