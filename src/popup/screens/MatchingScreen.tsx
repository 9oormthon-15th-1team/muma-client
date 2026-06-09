import { ScreenLayout, ScreenHeader, StatCard } from '../../components/ui'

interface MatchingScreenProps {
  onBack: () => void
  playlistCount: number
  totalSongs: number
  matchedCount: number
  processingCount: number
  progress: number
}

function VinylMatching() {
  // 로딩 화면과 동일한 LP — 주황 호가 바깥→안 링마다 방향을 교차하며 회전 (CW, CCW, CW, CCW). 퍼센트 없이 센터 라벨/구멍만.
  return (
    <svg
      className="size-[132px]"
      viewBox="0 0 132 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="66" cy="66" r="66" fill="#343A3A" />
      <circle cx="66" cy="66" r="58.8" stroke="#424848" strokeWidth="0.5" />
      <circle cx="66" cy="66" r="51.3" stroke="#424848" strokeWidth="0.5" />
      <circle cx="66" cy="66" r="43.3" stroke="#424848" strokeWidth="0.5" />
      <circle cx="66" cy="66" r="37" stroke="#424848" strokeWidth="0.5" />
      <path className="vinyl-arc vinyl-arc-cw" d="M15.08 36.6 A58.8 58.8 0 0 1 116.92 36.6" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
      <path className="vinyl-arc vinyl-arc-ccw" d="M91.65 21.57 A51.3 51.3 0 0 1 91.65 110.43" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
      <path className="vinyl-arc vinyl-arc-cw" d="M103.5 87.65 A43.3 43.3 0 0 1 28.5 87.65" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
      <path className="vinyl-arc vinyl-arc-ccw" d="M47.5 98.04 A37 37 0 0 1 47.5 33.96" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="66" cy="66" r="32" fill="#4B5250" />
      <circle cx="66" cy="66" r="29.59" fill="#F16B22" />
      <circle cx="66" cy="66" r="16.4" stroke="#000000" strokeWidth="0.6" />
      <circle cx="66" cy="65" r="3" fill="#343A3A" />
    </svg>
  )
}

export function MatchingScreen({ onBack, playlistCount, totalSongs, matchedCount, processingCount, progress }: MatchingScreenProps) {
  return (
    <ScreenLayout onBack={onBack}>
      <ScreenHeader title="Spotify로 옮기는 중이에요" subtitle="선택한 플레이리스트와 곡을 Spotify에서 매칭하고 있어요." />

      <div className="flex w-full shrink-0 justify-center">
        <VinylMatching />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-4)]">
        <div className="h-1 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)]">
          <div className="h-1 rounded-[var(--radius-full)] bg-[var(--color-brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="m-0 text-body-small-bold text-[var(--color-action-disabled)]">
          {playlistCount}개 플레이리스트 · {totalSongs}곡 선택됨
        </p>
      </div>

      <div className="flex w-full shrink-0 gap-[var(--spacing-16)]">
        <StatCard label="매칭 완료" value={`${matchedCount}곡`} filled />
        <StatCard label="처리 중" value={`${processingCount}곡`} />
      </div>

      <div className="flex h-[var(--size-button-height)] w-full shrink-0 items-center justify-center">
        <span className="animate-blink loading-dots text-body text-[var(--color-bg-secondary)]">창을 닫지 말고 잠시만 기다려주세요</span>
      </div>
    </ScreenLayout>
  )
}
