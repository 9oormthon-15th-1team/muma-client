import { PrimaryButton } from '../../components/ui'

interface MainScreenProps {
  onStart: () => void
}

export function MainScreen({ onStart }: MainScreenProps) {
  return (
    <div className="relative h-[var(--size-popup-height)] w-[var(--size-popup-width)] overflow-hidden bg-[var(--color-bg-default)]">
      {/* Vinyl record background (inline SVG — img-as-SVG was not painting in popup) */}
      <svg
        className="pointer-events-none absolute -left-[391px] -top-[294px] h-[867px] w-[867px]"
        viewBox="0 0 867 867"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="433.5" cy="433.5" r="433.5" fill="#343A3A" />
        <circle cx="433.5" cy="433.5" r="181.601" fill="#4B5250" />
        <circle cx="433.5" cy="433.5" r="167.932" fill="#FF6F21" />
        <circle cx="433.012" cy="433.012" r="407.127" stroke="#424848" />
        <circle cx="433.5" cy="433.5" r="380.277" stroke="#424848" />
        <circle cx="433.5" cy="436.429" r="324.625" stroke="#424848" />
        <circle cx="433.5" cy="435.453" r="251.399" stroke="#424848" />
        <circle cx="433.012" cy="433.012" r="208.927" stroke="#424848" />
        <circle cx="433.5" cy="433.5" r="352.939" stroke="#424848" />
        <circle cx="433.5" cy="433.5" r="272.878" stroke="#424848" />
        <circle cx="433.5" cy="433.5" r="297.287" stroke="#424848" />
        <path d="M433.5 203.581C562.099 203.581 666.348 307.613 666.348 435.941C666.348 564.268 562.099 668.301 433.5 668.301C304.9 668.301 200.652 564.268 200.652 435.941C200.652 307.613 304.901 203.581 433.5 203.581Z" stroke="#424848" />
        <path d="M432.524 240.682C539.555 240.682 626.318 327.012 626.318 433.5C626.318 539.988 539.555 626.317 432.524 626.317C325.492 626.317 238.73 539.988 238.73 433.5C238.73 327.012 325.492 240.682 432.524 240.682Z" stroke="#424848" />
        <circle cx="433.012" cy="433.012" r="80.7753" stroke="#0B0B0B" strokeWidth="1.5" />
        <circle cx="433" cy="434" r="18" fill="#343A3A" />
      </svg>

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
