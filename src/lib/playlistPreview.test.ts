import { describe, expect, test } from 'vitest'
import type { MelonTrackResult, Playlist } from './types'
import {
  buildExportTrackIds,
  buildPlaylistExportJobs,
  groupPreviewByPlaylist,
  spotifySelectionKey,
} from './playlistPreview'

const playlists: Playlist[] = [
  {
    seq: 'playlist-a',
    title: '출근길',
    songCount: 2,
    songs: [],
  },
  {
    seq: 'playlist-b',
    title: '운동',
    songCount: 2,
    songs: [],
  },
]

function row(
  playlistId: string,
  songId: string,
  position: number,
  resultIds: string[],
): MelonTrackResult {
  return {
    playlist_id: playlistId,
    position,
    melon_song_id: songId,
    title: `melon-${songId}`,
    artists_text: 'artist',
    melon_artist_ids: '',
    album_title: 'album',
    melon_album_id: '',
    melon_likes: 0,
    melon_song_url: `https://www.melon.com/song/detail.htm?songId=${songId}`,
    results: resultIds.map((id) => ({
      id,
      name: `spotify-${id}`,
      duration_ms: 180000,
      explicit: false,
      artists: [{ id: `artist-${id}`, name: 'artist' }],
      album: {
        id: `album-${id}`,
        name: 'album',
        images: [],
      },
    })),
  }
}

describe('groupPreviewByPlaylist', () => {
  test('groups preview rows by playlist_id and preserves extracted playlist order', () => {
    const preview = [
      row('playlist-b', 'song-3', 2, ['spotify-3']),
      row('playlist-a', 'song-1', 2, ['spotify-1']),
      row('playlist-a', 'song-2', 1, ['spotify-2']),
    ]

    expect(groupPreviewByPlaylist(playlists, preview)).toEqual([
      {
        playlist: playlists[0],
        rows: [preview[2], preview[1]],
      },
      {
        playlist: playlists[1],
        rows: [preview[0]],
      },
    ])
  })

  test('omits selected playlists that received no preview rows', () => {
    expect(groupPreviewByPlaylist(playlists, [row('playlist-b', 'song-3', 1, [])])).toEqual([
      {
        playlist: playlists[1],
        rows: [row('playlist-b', 'song-3', 1, [])],
      },
    ])
  })
})

describe('buildExportTrackIds', () => {
  test('includes single candidates automatically and selected ambiguous candidates only', () => {
    const rows = [
      row('playlist-a', 'single', 2, ['spotify-single']),
      row('playlist-a', 'ambiguous', 1, ['spotify-wrong', 'spotify-right']),
      row('playlist-a', 'missing', 3, []),
    ]
    const selected = {
      [spotifySelectionKey('playlist-a', 'ambiguous')]: 'spotify-right',
    }

    expect(buildExportTrackIds(rows, selected)).toEqual([
      'spotify-right',
      'spotify-single',
    ])
  })

  test('uses playlist-scoped keys so duplicate melon song ids do not collide', () => {
    const selected = {
      [spotifySelectionKey('playlist-a', 'same-song')]: 'spotify-a',
      [spotifySelectionKey('playlist-b', 'same-song')]: 'spotify-b',
    }

    expect(buildExportTrackIds([row('playlist-a', 'same-song', 1, ['x', 'spotify-a'])], selected)).toEqual([
      'spotify-a',
    ])
    expect(buildExportTrackIds([row('playlist-b', 'same-song', 1, ['x', 'spotify-b'])], selected)).toEqual([
      'spotify-b',
    ])
  })
})

describe('buildPlaylistExportJobs', () => {
  test('builds one export payload per playlist using original Melon playlist names', () => {
    const groups = groupPreviewByPlaylist(playlists, [
      row('playlist-a', 'song-1', 1, ['spotify-1']),
      row('playlist-b', 'song-2', 1, ['bad', 'spotify-2']),
    ])
    const selected = {
      [spotifySelectionKey('playlist-b', 'song-2')]: 'spotify-2',
    }

    expect(buildPlaylistExportJobs(groups, selected)).toEqual([
      {
        playlistSeq: 'playlist-a',
        payload: {
          playlist_name: '출근길',
          track_ids: ['spotify-1'],
        },
      },
      {
        playlistSeq: 'playlist-b',
        payload: {
          playlist_name: '운동',
          track_ids: ['spotify-2'],
        },
      },
    ])
  })

  test('skips playlists with no exportable tracks', () => {
    const groups = groupPreviewByPlaylist(playlists, [
      row('playlist-a', 'song-1', 1, []),
      row('playlist-b', 'song-2', 1, ['spotify-2']),
    ])

    expect(buildPlaylistExportJobs(groups, {})).toEqual([
      {
        playlistSeq: 'playlist-b',
        payload: {
          playlist_name: '운동',
          track_ids: ['spotify-2'],
        },
      },
    ])
  })
})
