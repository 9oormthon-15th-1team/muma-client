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
      {/* Base + rings (reuse loading assets) */}
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

      {/* Spotify logo in center */}
      <img src="/assets/vinyl-spotify-logo.svg" alt="" className="col-start-1 row-start-1 ml-[34px] mt-[34px] size-[64px]" />
      <img src="/assets/vinyl-spotify-dot.svg" alt="" className="col-start-1 row-start-1 ml-[50px] mt-[49px] size-[33px]" />
    </div>
  )
}

export function MatchingScreen({
  onBack,
  playlistCount,
  totalSongs,
  matchedCount,
  processingCount,
  progress,
}: MatchingScreenProps) {
  return (
    <div className="flex h-[600px] w-[380px] flex-col items-center gap-5 bg-[var(--color-bg-dark)] px-5 py-5">
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
          Spotify로 옮기는 중이에요
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[var(--color-brand-primary)]">
          선택한 플레이리스트와 곡을 Spotify에서 매칭하고 있어요.
        </p>
      </div>

      {/* Vinyl illustration */}
      <VinylMatching />

      {/* Progress bar + info */}
      <div className="flex w-full shrink-0 flex-col gap-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
          <div
            className="h-1 rounded-full bg-[var(--color-brand-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="m-0 text-[12px] font-semibold leading-[18px] text-[#a0a0a0]">
          {playlistCount}개 플레이리스트 · {totalSongs}곡 선택됨
        </p>
      </div>

      {/* Stats */}
      <div className="flex w-full shrink-0 gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-secondary)] px-4 py-3">
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">매칭 완료</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {matchedCount}곡
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-xl border border-[var(--color-bg-secondary)] px-4 py-3">
          <span className="text-[12px] leading-[18px] text-white/60">처리 중</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {processingCount}곡
          </span>
        </div>
      </div>

      {/* Disabled message */}
      <div className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl">
        <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-bg-secondary)]">
          창을 닫지 말고 잠시만 기다려주세요...
        </span>
      </div>
    </div>
  )
}
