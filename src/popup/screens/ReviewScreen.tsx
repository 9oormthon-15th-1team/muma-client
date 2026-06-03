import { useState } from 'react'
import type { MelonTrackResult } from '../../lib/types'
import { spotifySelectionKey } from '../../lib/playlistPreview'

interface ReviewScreenProps {
  onBack: () => void
  onNext: (selected: Record<string, string>) => void
  /** Ambiguous tracks (results.length >= 2) */
  tracks: MelonTrackResult[]
  /** Number of auto-matched tracks (results.length === 1) */
  autoMatchedCount: number
}

const SKIP_VALUE = '__skip__'
/** Show at most 2 Spotify candidates per song */
const MAX_CANDIDATES = 2

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex size-5 shrink-0 items-center justify-center rounded-[10px] ${
        checked ? 'bg-[#f97316]' : 'bg-[var(--color-bg-secondary)]'
      }`}
    >
      {checked && <img src="/assets/icon-check.svg" alt="" className="size-5" />}
    </div>
  )
}

function CandidateRow({
  candidate,
  isTopMatch,
  isSelected,
  onSelect,
}: {
  candidate: { name: string; artists: { name: string }[] }
  isTopMatch: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  const artistsText = candidate.artists.map((a) => a.name).join(', ')

  return (
    <button
      onClick={onSelect}
      className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
    >
      <CheckCircle checked={isSelected} />
      <div className="flex flex-col">
        <span
          className={`text-[12px] font-semibold leading-[18px] ${
            isTopMatch || isSelected ? 'text-[var(--color-text-inverse)]' : 'text-[#fffbeb]'
          }`}
        >
          {candidate.name}
        </span>
        <span className="text-[11px] leading-4 text-white/60">
          {artistsText} · {isTopMatch ? '정확히 일치' : '유사한 곡'}
        </span>
      </div>
    </button>
  )
}

function TrackCard({
  track,
  selectedId,
  onSelect,
}: {
  track: MelonTrackResult
  selectedId: string | undefined
  onSelect: (trackId: string) => void
}) {
  const hasSelection = selectedId !== undefined
  const candidates = track.results.slice(0, MAX_CANDIDATES)

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl border ${
        hasSelection
          ? 'border-[rgba(255,111,33,0.5)]'
          : 'border-[var(--color-bg-secondary)]'
      }`}
    >
      {/* Original melon song header */}
      <div
        className={`px-5 py-2 ${
          hasSelection ? 'bg-[#f97316]' : 'bg-[var(--color-bg-secondary)]'
        }`}
      >
        <p className="m-0 text-[14px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
          {track.title}
        </p>
        <p className="m-0 text-[12px] leading-4 text-[var(--color-text-inverse)]">
          {track.artists_text}
        </p>
      </div>

      {/* Spotify candidates + skip */}
      <div className="flex flex-col gap-4 p-4">
        {candidates.map((candidate, i) => (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            isTopMatch={i === 0}
            isSelected={selectedId === candidate.id}
            onSelect={() => onSelect(candidate.id)}
          />
        ))}

        {/* Skip option (always last) */}
        <button
          onClick={() => onSelect(SKIP_VALUE)}
          className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
        >
          <CheckCircle checked={selectedId === SKIP_VALUE} />
          <div className="flex flex-col">
            <span
              className={`text-[12px] font-semibold leading-[18px] ${
                selectedId === SKIP_VALUE ? 'text-[var(--color-text-inverse)]' : 'text-[#fffbeb]'
              }`}
            >
              선택 안 함
            </span>
            <span className="text-[11px] leading-4 text-white/60">
              이 곡은 옮기지 않을게요
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

export function ReviewScreen({
  onBack,
  onNext,
  tracks,
  autoMatchedCount,
}: ReviewScreenProps) {
  // 기본값: 각 모호곡의 첫 후보(정확히 일치)를 미리 선택해 진입 즉시 전송 가능 상태로 만든다.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      tracks.map((t) => [spotifySelectionKey(t.playlist_id, t.melon_song_id), t.results[0].id]),
    ),
  )

  const reviewedCount = Object.keys(selected).length
  const totalAmbiguous = tracks.length

  function handleSelect(key: string, trackId: string) {
    setSelected((prev) => ({ ...prev, [key]: trackId }))
  }

  function handleNext() {
    const result: Record<string, string> = {}
    for (const [songId, trackId] of Object.entries(selected)) {
      if (trackId !== SKIP_VALUE) {
        result[songId] = trackId
      }
    }
    onNext(result)
  }

  const allReviewed = reviewedCount === totalAmbiguous

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
      <div className="flex w-full shrink-0 flex-col gap-1">
        <h2 className="m-0 text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
          확인이 필요한 노래가 있어요
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[var(--color-brand-primary)] opacity-90">
          정확히 일치하지 않거나 유사한 노래는 직접 확인이 필요해요
        </p>
      </div>

      {/* Stats */}
      <div className="flex shrink-0 gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-secondary)] px-4 py-3">
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">정확히 매칭된 노래</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {autoMatchedCount}곡
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-xl border border-[var(--color-bg-secondary)] px-4 py-3">
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">확인이 필요한 노래</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {reviewedCount}/{totalAmbiguous}개
          </span>
        </div>
      </div>

      {/* Track review cards */}
      {tracks.map((track) => {
        const key = spotifySelectionKey(track.playlist_id, track.melon_song_id)
        return (
          <TrackCard
            key={key}
            track={track}
            selectedId={selected[key]}
            onSelect={(trackId) => handleSelect(key, trackId)}
          />
        )
      })}

      {/* CTA */}
      {allReviewed ? (
        <button
          onClick={handleNext}
          className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-[var(--color-brand-primary)] text-[15px] font-semibold text-[var(--color-text-inverse)]"
        >
          다음
        </button>
      ) : (
        <button
          disabled
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl border border-[var(--color-bg-secondary)] bg-transparent text-[15px] font-semibold text-[var(--color-bg-secondary)]"
        >
          모든 곡을 확인해주세요
        </button>
      )}
    </div>
  )
}
