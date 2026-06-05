import { useState } from 'react'
import type { MelonTrackResult } from '../../lib/types'
import { spotifySelectionKey } from '../../lib/playlistPreview'
import { PrimaryButton, CheckCircle, ScreenLayout, ScreenHeader, StatCard } from '../../components/ui'

interface ReviewScreenProps {
  onBack: () => void
  onNext: (selected: Record<string, string>) => void
  tracks: MelonTrackResult[]
  autoMatchedCount: number
}

const SKIP_VALUE = '__skip__'
const MAX_CANDIDATES = 2

function CandidateRow({ candidate, isTopMatch, isSelected, onSelect }: {
  candidate: { name: string; artists: { name: string }[] }
  isTopMatch: boolean; isSelected: boolean; onSelect: () => void
}) {
  const artistsText = candidate.artists.map((a) => a.name).join(', ')
  return (
    <button onClick={onSelect} className="flex cursor-pointer items-center gap-[var(--spacing-8)] border-none bg-transparent p-0 text-left">
      <CheckCircle checked={isSelected} />
      <div className="flex flex-col">
        <span className={`text-body-small-bold ${isTopMatch || isSelected ? 'text-[var(--color-text-inverse)]' : 'text-[var(--color-text-warning)]'}`}>
          {candidate.name}
        </span>
        <span className="text-caption text-[var(--color-text-inverse-2)]">
          {artistsText} · {isTopMatch ? '정확히 일치' : '유사한 곡'}
        </span>
      </div>
    </button>
  )
}

function TrackCard({ track, selectedId, onSelect }: {
  track: MelonTrackResult; selectedId: string | undefined; onSelect: (trackId: string) => void
}) {
  const hasSelection = selectedId !== undefined
  const candidates = track.results.slice(0, MAX_CANDIDATES)

  return (
    <div className={`glass shrink-0 overflow-hidden rounded-[var(--radius-12)] border bg-[var(--color-glass)] ${hasSelection ? 'border-[rgba(255,111,33,0.5)]' : 'border-[var(--color-bg-secondary)]'}`}>
      <div className={`px-[var(--spacing-20)] py-[var(--spacing-8)] ${hasSelection ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-secondary)]'}`}>
        <p className="m-0 text-body-md-bold text-[var(--color-text-inverse)]">{track.title}</p>
        <p className="m-0 text-[12px] leading-4 text-[var(--color-text-inverse)]">{track.artists_text}</p>
      </div>
      <div className="flex flex-col gap-[var(--spacing-16)] p-[var(--spacing-16)]">
        {candidates.map((c, i) => (
          <CandidateRow key={c.id} candidate={c} isTopMatch={i === 0} isSelected={selectedId === c.id} onSelect={() => onSelect(c.id)} />
        ))}
        <button onClick={() => onSelect(SKIP_VALUE)} className="flex cursor-pointer items-center gap-[var(--spacing-8)] border-none bg-transparent p-0 text-left">
          <CheckCircle checked={selectedId === SKIP_VALUE} />
          <div className="flex flex-col">
            <span className={`text-body-small-bold ${selectedId === SKIP_VALUE ? 'text-[var(--color-text-inverse)]' : 'text-[var(--color-text-warning)]'}`}>선택 안 함</span>
            <span className="text-caption text-[var(--color-text-inverse-2)]">이 곡은 옮기지 않을게요</span>
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
  const allReviewed = reviewedCount === totalAmbiguous

  function handleSelect(key: string, trackId: string) {
    setSelected((prev) => ({ ...prev, [key]: trackId }))
  }

  function handleNext() {
    const result: Record<string, string> = {}
    for (const [songId, trackId] of Object.entries(selected)) {
      if (trackId !== SKIP_VALUE) result[songId] = trackId
    }
    onNext(result)
  }

  return (
    <ScreenLayout onBack={onBack} scrollable>
      <ScreenHeader title="확인이 필요한 노래가 있어요" subtitle="정확히 일치하지 않거나 유사한 노래는 직접 확인이 필요해요" />

      <div className="flex shrink-0 gap-[var(--spacing-16)]">
        <StatCard label="정확히 매칭된 노래" value={`${autoMatchedCount}곡`} filled />
        <StatCard label="확인이 필요한 노래" value={`${reviewedCount}/${totalAmbiguous}개`} />
      </div>

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

      <p className="m-0 shrink-0 text-center text-body-small-bold text-[var(--color-brand-primary)]">
        후보곡을 선택해주세요
      </p>

      <PrimaryButton variant={allReviewed ? 'primary' : 'outline'} disabled={!allReviewed} onClick={handleNext}>
        완료
      </PrimaryButton>
    </ScreenLayout>
  )
}
