import { PrimaryButton } from '../../components/ui'

interface MainScreenProps {
  onStart: () => void
}

export function MainScreen({ onStart }: MainScreenProps) {
  return (
    <div className="relative h-[var(--size-popup-height)] w-[var(--size-popup-width)] overflow-hidden bg-[var(--color-bg-default)]">
      {/* Vinyl record background */}
      <img
        src="/assets/vinyl-bg.svg"
        alt=""
        className="pointer-events-none absolute -left-[391px] -top-[294px] h-[867px] w-[867px]"
      />

      {/* Top: line + MuMa branding */}
      <div className="absolute right-[var(--spacing-20)] top-[var(--spacing-20)] flex flex-col items-end gap-[var(--spacing-4)]">
        <img src="/assets/line-top.svg" alt="" className="w-[339px]" />
        <p className="text-logo text-[var(--color-brand-primary)]">
          MuMa
        </p>
      </div>

      {/* Bottom: headline + CTA */}
      <div className="absolute bottom-0 left-0 flex w-full flex-col gap-[var(--spacing-24)] px-[var(--spacing-20)] pb-10">
        <div className="text-display tracking-[-1.12px] text-[var(--color-text-inverse)] opacity-80">
          <p>나만의</p>
          <p>플레이리스트 옮기기</p>
        </div>
        <PrimaryButton variant="outline" onClick={onStart}>
          시작하기
        </PrimaryButton>
      </div>
    </div>
  )
}
