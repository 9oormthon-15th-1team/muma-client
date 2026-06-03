interface MainScreenProps {
  onStart: () => void
}

export function MainScreen({ onStart }: MainScreenProps) {
  return (
    <div className="relative h-[600px] w-[380px] overflow-hidden bg-[var(--color-bg-dark)]">
      {/* Vinyl record background */}
      <img
        src="/assets/vinyl-bg.svg"
        alt=""
        className="pointer-events-none absolute -left-[391px] -top-[294px] h-[867px] w-[867px]"
      />

      {/* Top: line + MuMa branding */}
      <div className="absolute right-[20px] top-[20px] flex flex-col items-end gap-1">
        <img src="/assets/line-top.svg" alt="" className="w-[339px]" />
        <p className="text-[22px] font-bold leading-[33px] text-[var(--color-brand-primary)]">
          MuMa
        </p>
      </div>

      {/* Bottom: headline + CTA */}
      <div className="absolute bottom-0 left-0 flex w-full flex-col gap-6 px-5 pb-10">
        <div className="text-[28px] font-extralight leading-[45px] tracking-[-1.12px] text-[var(--color-text-inverse)] opacity-80">
          <p>나만의</p>
          <p>플레이리스트 옮기기</p>
        </div>
        <button
          onClick={onStart}
          className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border-none bg-[var(--color-bg-secondary)] text-[15px] font-medium text-[var(--color-text-inverse)]"
        >
          시작하기
        </button>
      </div>
    </div>
  )
}
