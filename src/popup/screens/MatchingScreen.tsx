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
  return (
    <div className="relative inline-grid place-items-start">
      <img src="/assets/loading-outer.svg" alt="" className="col-start-1 row-start-1 size-[132px]" />
      <img src="/assets/loading-inner.svg" alt="" className="col-start-1 row-start-1 ml-[34px] mt-[34px] size-[64px]" />
      <img src="/assets/loading-ring1.svg" alt="" className="col-start-1 row-start-1 ml-[7px] mt-[7px] size-[118px]" />
      <div className="col-start-1 row-start-1 ml-[7px] mt-[7px] flex h-[59px] w-[118px] items-center justify-center">
        <img src="/assets/loading-half1.svg" alt="" className="h-[118px] w-[59px] rotate-90" />
      </div>
      <img src="/assets/loading-ring2.svg" alt="" className="col-start-1 row-start-1 ml-[14px] mt-[14px] size-[103px]" />
      <img src="/assets/loading-half2.svg" alt="" className="col-start-1 row-start-1 ml-[14px] mt-[66px] h-[51.5px] w-[103px]" />
      <img src="/assets/loading-ring3.svg" alt="" className="col-start-1 row-start-1 ml-[22px] mt-[22px] size-[87px]" />
      <img src="/assets/loading-half3.svg" alt="" className="col-start-1 row-start-1 ml-[22px] mt-[22px] h-[43.5px] w-[87px]" />
      <img src="/assets/loading-ring4.svg" alt="" className="col-start-1 row-start-1 ml-[29px] mt-[29px] size-[74px]" />
      <img src="/assets/loading-half4.svg" alt="" className="col-start-1 row-start-1 ml-[29px] mt-[65px] h-[37px] w-[74px]" />
      <img src="/assets/loading-bottom.svg" alt="" className="col-start-1 row-start-1 mt-[65px] h-[66px] w-[132px]" />
      <img src="/assets/vinyl-spotify-logo.svg" alt="" className="col-start-1 row-start-1 ml-[34px] mt-[34px] size-[64px]" />
      <img src="/assets/vinyl-spotify-dot.svg" alt="" className="col-start-1 row-start-1 ml-[50px] mt-[49px] size-[33px]" />
    </div>
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
        <p className="m-0 text-[12px] font-semibold leading-[18px] text-[var(--color-action-disabled)]">
          {playlistCount}개 플레이리스트 · {totalSongs}곡 선택됨
        </p>
      </div>

      <div className="flex w-full shrink-0 gap-[var(--spacing-16)]">
        <StatCard label="매칭 완료" value={`${matchedCount}곡`} filled />
        <StatCard label="처리 중" value={`${processingCount}곡`} />
      </div>

      <div className="flex h-[var(--size-button-height)] w-full shrink-0 items-center justify-center">
        <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-bg-secondary)]">창을 닫지 말고 잠시만 기다려주세요...</span>
      </div>
    </ScreenLayout>
  )
}
