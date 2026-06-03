interface GuideScreenProps {
  onBack: () => void
  onNext: () => void
}

const STEPS = [
  {
    title: '멜론 플레이리스트를 확인해요',
    desc: '멜론에 로그인한 상태로 MuMa에 접속해요',
  },
  {
    title: '옮길 플레이리스트를 선택해요',
    desc: 'Spotify로 옮길 플리를 고르고 곡 목록을 확인해요',
  },
  {
    title: 'Spotify에 플레이리스트 생성하기',
    desc: '플리를 생성하고 생성된 플리를 확인해요',
  },
]

function VinylIllustration() {
  return (
    <div className="relative inline-grid place-items-start">
      <img src="/assets/vinyl-outer.svg" alt="" className="col-start-1 row-start-1 size-[132px]" />
      <img src="/assets/vinyl-ring1.svg" alt="" className="col-start-1 row-start-1 ml-[7px] mt-[7px] size-[118px]" />
      <img src="/assets/vinyl-ring2.svg" alt="" className="col-start-1 row-start-1 ml-[14px] mt-[14px] size-[103px]" />
      <img src="/assets/vinyl-ring3.svg" alt="" className="col-start-1 row-start-1 ml-[22px] mt-[22px] size-[87px]" />
      <img src="/assets/vinyl-center.svg" alt="" className="col-start-1 row-start-1 ml-[29px] mt-[29px] size-[74px]" />
    </div>
  )
}

function PlaylistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 5H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17.5 10H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 15H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="15" r="2" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

export function GuideScreen({ onBack, onNext }: GuideScreenProps) {
  return (
    <div className="flex h-[600px] w-[380px] flex-col items-center gap-5 bg-[var(--color-bg-dark)] p-5">
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
      <div className="flex w-full flex-col gap-1">
        <h2 className="m-0 text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
          MuMa 가이드
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[#f97316] opacity-90">
          MuMa를 활용하기 위한 설명이에요
        </p>
      </div>

      {/* Vinyl illustration */}
      <VinylIllustration />

      {/* Steps card */}
      <div className="flex w-full flex-col gap-2 rounded-xl border border-[var(--color-bg-secondary)] p-4">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-white">
              <span className="text-[11px] font-semibold leading-4 text-[#343a3a]">{i + 1}</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="m-0 text-[12px] font-semibold leading-[18px] text-[var(--color-text-inverse)]">
                {step.title}
              </p>
              <p className="m-0 text-[12px] leading-[18px] text-white/60">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={onNext}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-1 rounded-xl border-none bg-[var(--color-brand-primary)] text-[15px] font-semibold text-[var(--color-text-inverse)]"
      >
        플레이리스트 가져오기
        <PlaylistIcon />
      </button>
    </div>
  )
}
