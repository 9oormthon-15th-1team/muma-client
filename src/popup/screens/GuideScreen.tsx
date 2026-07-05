import { PrimaryButton, ScreenLayout, ScreenHeader, IconPlaylist } from '../../components/ui'

interface GuideScreenProps {
  onBack: () => void
  onNext: () => void
}

const STEPS = [
  { title: '멜론 플레이리스트를 확인해요', desc: '멜론에 로그인한 상태로 muma에 접속해요' },
  { title: '옮길 플레이리스트를 선택해요', desc: '옮길 플리를 고르고 곡 목록을 확인해요' },
  { title: '선택한 플랫폼에 플레이리스트 생성하기', desc: '플리를 생성하고 생성된 플리를 확인해요' },
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

export function GuideScreen({ onBack, onNext }: GuideScreenProps) {
  return (
    <ScreenLayout onBack={onBack}>
      <ScreenHeader title="muma 가이드" subtitle="muma를 활용하기 위한 설명이에요" />

      <div className="flex w-full justify-center">
        <VinylIllustration />
      </div>

      {/* Steps card */}
      <div className="glass flex w-full flex-col gap-[var(--spacing-8)] rounded-[var(--radius-12)] border border-[var(--color-bg-secondary)] bg-[var(--color-glass)] p-[var(--spacing-16)]">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-[var(--spacing-8)]">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-white">
              <span className="text-caption-bold text-[var(--color-text-secondary)]">{i + 1}</span>
            </div>
            <div className="flex flex-col gap-[var(--spacing-4)]">
              <p className="m-0 text-body-small-bold text-[var(--color-text-inverse)]">{step.title}</p>
              <p className="m-0 text-body-small text-[var(--color-text-inverse-2)]">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onNext}>
        플레이리스트 가져오기
        <IconPlaylist />
      </PrimaryButton>
    </ScreenLayout>
  )
}
