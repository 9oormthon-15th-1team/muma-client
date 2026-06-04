import { ScreenLayout, ScreenHeader, CheckCircle } from '../../components/ui'

interface LoadingScreenProps {
  onBack: () => void
  count: number
  progress: number
  statusMessage: string
  steps: { label: string; done: boolean }[]
}

function VinylLoading({ count }: { count: number }) {
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
      <span className="col-start-1 row-start-1 ml-[55px] mt-[54px] text-heading-2 text-[#424848]">{count}</span>
      <img src="/assets/loading-bottom.svg" alt="" className="col-start-1 row-start-1 mt-[65px] h-[66px] w-[132px]" />
    </div>
  )
}

export function LoadingScreen({ onBack, count, progress, statusMessage, steps }: LoadingScreenProps) {
  return (
    <ScreenLayout onBack={onBack}>
      <ScreenHeader title="플레이리스트를 불러오는 중이에요" subtitle="멜론 계정에 저장된 플레이리스트를 확인하고 있어요." />

      <div className="flex w-full shrink-0 justify-center">
        <VinylLoading count={count} />
      </div>

      {/* Progress */}
      <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-4)]">
        <div className="h-1 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)]">
          <div className="h-1 rounded-[var(--radius-full)] bg-[var(--color-brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="m-0 text-caption text-[var(--color-action-disabled)]">{statusMessage}</p>
      </div>

      {/* Steps checklist */}
      <div className="glass flex w-full flex-col gap-[var(--spacing-12)] rounded-[var(--radius-12)] border border-[var(--color-bg-secondary)] bg-[var(--color-glass)] p-[var(--spacing-16)]">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-[var(--spacing-8)]">
            <CheckCircle checked={step.done} />
            <span className="text-body-small-bold text-[var(--color-text-inverse)]">{step.label}</span>
          </div>
        ))}
      </div>

      <div className="flex h-[var(--size-button-height)] w-full shrink-0 items-center justify-center">
        <span className="text-body text-[var(--color-bg-secondary)]">잠시만 기다려주세요...</span>
      </div>
    </ScreenLayout>
  )
}
