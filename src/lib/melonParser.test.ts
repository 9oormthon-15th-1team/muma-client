import { test, expect } from 'vitest'
import { parseSongList, parsePlaylistSeqs } from './melonParser'

// 실제 listSong.htm 응답에서 발췌한 2곡 구조
const FIXTURE = `
<div class="section_playlist">
<h3 class="title arr">수록곡 <span class="cnt">(2)</span></h3>
<table>
<tbody>
<tr>
  <td><div class="wrap pd_none left">
    <input type="checkbox" class="input_check" name="input_check" value="1644933" />
  </div></td>
  <td class="no"><div class="wrap">1</div></td>
  <td class="t_left"><div class="wrap pd_none"><div class="ellipsis">
    <a href="javascript:melon.play.playSong('75010101',1644933);" class="fc_gray" title="언젠가 이곳이 재생 - 새 창">언젠가 이곳이</a>
  </div></div></td>
  <td class="t_left"><div class="wrap wrapArtistName"><div id="artistName" class="ellipsis">
    <a href="javascript:melon.link.goArtistDetail('261143');" class="fc_mgray">이수</a>
  </div></div></td>
  <td class="t_left"><div class="wrap"><div class="ellipsis">
    <a href="javascript:melon.link.goAlbumDetail('352036');" class="fc_mgray">뮤지컬 대장금 OST &#x27;언젠가 이곳이&#x27;</a>
  </div></div></td>
</tr>
<tr>
  <td><div class="wrap pd_none left">
    <input type="checkbox" class="input_check" name="input_check" value="3801596" />
  </div></td>
  <td class="no"><div class="wrap">2</div></td>
  <td class="t_left"><div class="wrap pd_none"><div class="ellipsis">
    <a href="javascript:melon.play.playSong('75010101',3801596);" class="fc_gray" title="돌고 돌아도 재생 - 새 창">돌고 돌아도</a>
  </div></div></td>
  <td class="t_left"><div class="wrap wrapArtistName"><div id="artistName" class="ellipsis">
    <a href="javascript:melon.link.goArtistDetail('52607');" class="fc_mgray">XIA (준수)</a>
  </div></div></td>
  <td class="t_left"><div class="wrap"><div class="ellipsis">
    <a href="javascript:melon.link.goAlbumDetail('2123615');" class="fc_mgray">Tarantallegra</a>
  </div></div></td>
</tr>
</tbody>
</table>
</div>`

test('parseSongList: 곡 수와 각 필드를 추출한다', () => {
  const songs = parseSongList(FIXTURE)
  expect(songs).toHaveLength(2)
  expect(songs[0]).toEqual({
    songId: '1644933',
    trackNo: 1,
    title: '언젠가 이곳이',
    artist: '이수',
    album: "뮤지컬 대장금 OST '언젠가 이곳이'",
  })
  expect(songs[1].songId).toBe('3801596')
  expect(songs[1].artist).toBe('XIA (준수)')
  expect(songs[1].album).toBe('Tarantallegra')
})

test('parseSongList: 곡이 없으면 빈 배열', () => {
  expect(parseSongList('<div class="section_playlist"></div>')).toEqual([])
})

const LIST_FIXTURE = `
<ul class="list_playlist">
  <li>
    <a href="/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=446121958">내 인생 플리</a>
  </li>
  <li>
    <a href="/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=500000001">운동할 때</a>
  </li>
  <li>
    <a href="/mymusic/playlist/mymusicplaylistview_inform.htm?plylstSeq=446121958">중복은 무시</a>
  </li>
</ul>`

test('parsePlaylistSeqs: 중복 제거하고 seq+title 추출', () => {
  const result = parsePlaylistSeqs(LIST_FIXTURE)
  expect(result).toEqual([
    { seq: '446121958', title: '내 인생 플리' },
    { seq: '500000001', title: '운동할 때' },
  ])
})

test('parsePlaylistSeqs: 항목 없으면 빈 배열', () => {
  expect(parsePlaylistSeqs('<div></div>')).toEqual([])
})
