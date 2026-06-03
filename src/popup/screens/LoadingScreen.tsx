interface LoadingScreenProps {
  onBack: () => void
  /** Number to display in the vinyl center (e.g. playlist count) */
  count: number
  /** 0–100 */
  progress: number
  statusMessage: string
  steps: { label: string; done: boolean }[]
}

function VinylLoading({ count }: { count: number }) {
  return (
    <div className="relative inline-grid place-items-start">
      {/* Base layers */}
      <img src="/assets/loading-outer.svg" alt="" className="col-start-1 row-start-1 size-[132px]" />
      <img src="/assets/loading-inner.svg" alt="" className="col-start-1 row-start-1 ml-[34px] mt-[34px] size-[64px]" />

      {/* Concentric rings */}
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

      {/* Center count */}
      <span className="col-start-1 row-start-1 ml-[55px] mt-[54px] text-[17px] font-bold leading-[24px] text-[#424848]">
        {count}
      </span>

      {/* Bottom overlay */}
      <img src="/assets/loading-bottom.svg" alt="" className="col-start-1 row-start-1 mt-[65px] h-[66px] w-[132px]" />
    </div>
  )
}

export function LoadingScreen({
  onBack,
  count,
  progress,
  statusMessage,
  steps,
}: LoadingScreenProps) {
  return (
    <div className="flex h-[600px] w-[380px] flex-col items-center justify-center gap-[23px] bg-[var(--color-bg-dark)] p-5">
      {/* Back button */}
      <div className="w-full">
        <button
          onClick={onBack}
          className="flex size-8 cursor-pointer items-center justify-center rounded-[9px] border-none bg-[var(--color-bg-secondary)]"
        >
          <img src="/assets/icon-back.svg" alt="뒤로" className="size-5" />
        </button>
      </div>

      {/* Header */}
      <div className="flex w-full flex-col gap-2">
        <h2 className="m-0 text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
          플레이리스트를 불러오는 중이에요
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[var(--color-brand-primary)]">
          멜론 계정에 저장된 플레이리스트를 확인하고 있어요.
        </p>
      </div>

      {/* Vinyl loading illustration */}
      <VinylLoading count={count} />

      {/* Progress bar */}
      <div className="flex w-full flex-col gap-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
          <div
            className="h-1 rounded-full bg-[var(--color-brand-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="m-0 text-[11px] leading-4 text-[#a0a0a0]">
          {statusMessage}
        </p>
      </div>

      {/* Steps checklist */}
      <div className="flex w-full flex-col gap-3 rounded-xl border border-[var(--color-bg-secondary)] p-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded-[10px] ${
                step.done ? 'bg-[#f97316]' : 'bg-[var(--color-bg-secondary)]'
              }`}
            >
              {step.done && (
                <img src="/assets/icon-check.svg" alt="" className="size-5" />
              )}
            </div>
            <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Disabled button */}
      <div className="flex h-12 w-full items-center justify-center rounded-xl">
        <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-bg-secondary)]">
          잠시만 기다려주세요...
        </span>
      </div>
    </div>
  )
}
