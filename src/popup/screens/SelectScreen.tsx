import { useState } from 'react'
import type { Playlist } from '../../lib/types'
import { songSelectionKey } from '../../lib/playlistPreview'

interface SelectScreenProps {
  playlists: Playlist[]
  selectedPlaylists: Set<string>
  selectedSongs: Set<string>
  canProceed: boolean
  onTogglePlaylist: (seq: string) => void
  onToggleAllPlaylists: () => void
  onToggleSong: (seq: string, songId: string) => void
  onToggleAllSongs: (pl: Playlist) => void
  onBack: () => void
  onNext: () => void
}

function CheckCircle({ checked, size = 20 }: { checked: boolean; size?: number }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[10px] ${
        checked ? 'bg-[#f97316]' : 'bg-[var(--color-bg-secondary)]'
      }`}
      style={{ width: size, height: size }}
    >
      {checked && (
        <img src="/assets/icon-check.svg" alt="" style={{ width: size, height: size }} />
      )}
    </div>
  )
}

function PlaylistCard({
  playlist,
  selected,
  expanded,
  selectedSongs,
  onToggle,
  onExpand,
  onToggleSong,
  onToggleAllSongs,
}: {
  playlist: Playlist
  selected: boolean
  expanded: boolean
  selectedSongs: Set<string>
  onToggle: () => void
  onExpand: () => void
  onToggleSong: (songId: string) => void
  onToggleAllSongs: () => void
}) {
  const allSongsSelected =
    playlist.songs.length > 0 &&
    playlist.songs.every((s) => selectedSongs.has(songSelectionKey(playlist.seq, s.songId)))

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 ${
        selected
          ? 'border-[var(--color-brand-primary)] bg-[rgba(248,250,252,0.1)]'
          : 'border-[var(--color-bg-secondary)]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-[46px] py-1 ${expanded ? 'border-b border-[var(--color-bg-secondary)]' : ''}`}>
        <div className="flex flex-1 items-center gap-2 py-1">
          <button onClick={onToggle} className="cursor-pointer border-none bg-transparent p-0">
            <CheckCircle checked={selected} />
          </button>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">
              {playlist.title}
            </span>
            <span className="text-[11px] leading-4 text-[var(--color-text-inverse)]">
              {playlist.songCount}곡
            </span>
          </div>
        </div>
        <button
          onClick={onExpand}
          className={`flex size-10 cursor-pointer items-center justify-center rounded-[9px] border-none bg-[var(--color-bg-secondary)] transition-transform ${
            expanded ? '' : 'rotate-180'
          }`}
        >
          <img src="/assets/icon-arrow-down.svg" alt="" className="size-5 -rotate-90" />
        </button>
      </div>

      {/* Song list (expanded) */}
      {expanded && (
        <div className="flex flex-col gap-2">
          {/* 곡 전체선택 */}
          <button
            onClick={onToggleAllSongs}
            className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
          >
            <CheckCircle checked={allSongsSelected} size={16} />
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-brand-primary)]">
              곡 전체선택
            </span>
          </button>
          {playlist.songs.map((song) => (
            <button
              key={song.songId}
              onClick={() => onToggleSong(song.songId)}
              className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
            >
              <CheckCircle
                checked={selectedSongs.has(songSelectionKey(playlist.seq, song.songId))}
                size={16}
              />
              <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">
                {song.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SelectScreen({
  playlists,
  selectedPlaylists,
  selectedSongs,
  canProceed,
  onTogglePlaylist,
  onToggleAllPlaylists,
  onToggleSong,
  onToggleAllSongs,
  onBack,
  onNext,
}: SelectScreenProps) {
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null)

  const totalSongs = playlists.reduce((sum, pl) => sum + pl.songCount, 0)
  const allSelected = playlists.length > 0 && selectedPlaylists.size === playlists.length
  const selectedSongCount = playlists
    .filter((pl) => selectedPlaylists.has(pl.seq))
    .reduce(
      (sum, pl) =>
        sum + pl.songs.filter((s) => selectedSongs.has(songSelectionKey(pl.seq, s.songId))).length,
      0,
    )

  function toggleExpand(seq: string) {
    setExpandedSeq((prev) => (prev === seq ? null : seq))
  }

  return (
    <div className="flex h-[600px] w-[380px] flex-col gap-5 overflow-y-auto bg-[var(--color-bg-dark)] p-5">
      {/* Back */}
      <div className="w-full shrink-0">
        <button
          onClick={onBack}
          className="flex size-8 cursor-pointer items-center justify-center rounded-[9px] border-none bg-[var(--color-bg-secondary)]"
        >
          <img src="/assets/icon-back.svg" alt="뒤로" className="size-5" />
        </button>
      </div>

      {/* Header */}
      <div className="flex w-full shrink-0 flex-col gap-2">
        <h2 className="m-0 text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
          옮길 플레이리스트를 선택해주세요
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[var(--color-brand-primary)]">
          총 {playlists.length}개의 플레이리스트를 찾았어요.
        </p>
      </div>

      {/* Stats */}
      <div className="flex shrink-0 gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-xl border border-[var(--color-bg-secondary)] px-4 py-3">
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">총 플레이리스트</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {playlists.length}개
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-xl border border-[var(--color-bg-secondary)] px-4 py-3">
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">총 수록곡</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {totalSongs}곡
          </span>
        </div>
      </div>

      {/* Select all + list */}
      <div className="flex flex-col gap-4">
        {/* Select all row */}
        <div className="flex items-center justify-between border-b border-[var(--color-bg-secondary)] py-2">
          <button onClick={onToggleAllPlaylists} className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0">
            <CheckCircle checked={allSelected} />
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">
              전체선택
            </span>
          </button>
          {selectedPlaylists.size > 0 && (
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-brand-primary)]">
              {selectedPlaylists.size}개 선택됨
            </span>
          )}
        </div>

        {/* Playlist cards */}
        {playlists.map((pl) => (
          <PlaylistCard
            key={pl.seq}
            playlist={pl}
            selected={selectedPlaylists.has(pl.seq)}
            expanded={expandedSeq === pl.seq}
            selectedSongs={selectedSongs}
            onToggle={() => onTogglePlaylist(pl.seq)}
            onExpand={() => toggleExpand(pl.seq)}
            onToggleSong={(songId) => onToggleSong(pl.seq, songId)}
            onToggleAllSongs={() => onToggleAllSongs(pl)}
          />
        ))}
      </div>

      {/* Selection info */}
      <p className="m-0 shrink-0 text-center text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">
        {selectedPlaylists.size}개 플레이리스트 · {selectedSongCount}곡 선택됨
      </p>

      {/* CTA button */}
      {canProceed ? (
        <button
          onClick={onNext}
          className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-[var(--color-brand-primary)] text-[15px] font-semibold text-[var(--color-text-inverse)]"
        >
          다음
        </button>
      ) : (
        <button
          disabled
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl border border-[var(--color-bg-secondary)] bg-transparent text-[15px] font-semibold text-[var(--color-bg-secondary)]"
        >
          선택한 플레이리스트 옮기기
        </button>
      )}
    </div>
  )
}
