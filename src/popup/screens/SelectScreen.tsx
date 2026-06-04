import { useState } from 'react'
import type { Playlist } from '../../lib/types'
import { songSelectionKey } from '../../lib/playlistPreview'
import { PrimaryButton, CheckCircle, IconArrow, SelectionBadge, StatCard, ScreenLayout, ScreenHeader } from '../../components/ui'

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
    <div className={`flex shrink-0 flex-col gap-[var(--spacing-12)] rounded-[var(--radius-12)] border px-[var(--spacing-16)] py-[var(--spacing-12)] ${
      selected ? 'border-[var(--color-brand-primary)] bg-[rgba(248,250,252,0.1)]' : 'border-[var(--color-bg-secondary)]'
    }`}>
      <div className={`flex items-center py-[var(--spacing-4)] ${expanded ? 'border-b border-[var(--color-bg-secondary)]' : ''}`}>
        <div className="flex flex-1 items-center gap-[var(--spacing-8)] py-[var(--spacing-4)]">
          <button onClick={onToggle} className="cursor-pointer border-none bg-transparent p-0">
            <CheckCircle checked={selected} />
          </button>
          <div className="flex flex-col gap-[var(--spacing-4)]">
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">{playlist.title}</span>
            <span className="text-[11px] leading-4 text-[var(--color-text-inverse)]">{playlist.songCount}곡</span>
          </div>
        </div>
        <IconArrow expanded={expanded} onClick={onExpand} />
      </div>
      {expanded && (
        <div className="flex flex-col gap-[var(--spacing-8)]">
          {/* 곡 전체선택 */}
          <button
            onClick={onToggleAllSongs}
            className="flex cursor-pointer items-center gap-[var(--spacing-8)] border-none bg-transparent p-0 text-left"
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
              className="flex cursor-pointer items-center gap-[var(--spacing-8)] border-none bg-transparent p-0 text-left"
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
    <ScreenLayout onBack={onBack} scrollable>
      <ScreenHeader title="옮길 플레이리스트를 선택해주세요" subtitle={`총 ${playlists.length}개의 플레이리스트를 찾았어요.`} />

      <div className="flex shrink-0 gap-[var(--spacing-16)]">
        <StatCard label="총 플레이리스트" value={`${playlists.length}개`} />
        <StatCard label="총 수록곡" value={`${totalSongs}곡`} />
      </div>

      <div className="flex flex-col gap-[var(--spacing-16)]">
        <div className="flex items-center justify-between border-b border-[var(--color-bg-secondary)] py-[var(--spacing-8)]">
          <button onClick={onToggleAllPlaylists} className="flex cursor-pointer items-center gap-[var(--spacing-8)] border-none bg-transparent p-0">
            <CheckCircle checked={allSelected} />
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">전체선택</span>
          </button>
          <SelectionBadge count={selectedPlaylists.size} />
        </div>
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

      <p className="m-0 shrink-0 text-center text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">
        {selectedPlaylists.size}개 플레이리스트 · {selectedSongCount}곡 선택됨
      </p>

      <PrimaryButton variant={canProceed ? 'primary' : 'outline'} disabled={!canProceed} onClick={onNext}>
        {canProceed ? '다음' : '선택한 플레이리스트 옮기기'}
      </PrimaryButton>
    </ScreenLayout>
  )
}
