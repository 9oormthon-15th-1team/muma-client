import { useState } from 'react'
import { PrimaryButton, PlatformCard, ScreenLayout, ScreenHeader } from '../../components/ui'

type Platform = 'spotify' | 'ytmusic' | null

interface PlatformScreenProps {
  onBack: () => void
  onNext: (platform: 'spotify' | 'ytmusic') => void
  /** OAuth 등 다음 단계 진행 중 — 버튼에 스피너를 띄우고 중복 클릭을 막는다 */
  loading?: boolean
}

const PLATFORMS = [
  { id: 'spotify' as const, label: 'Spotify', icon: '/assets/icon-spotify.svg', disabled: false },
  { id: 'ytmusic' as const, label: 'Youtube music', icon: '/assets/icon-ytmusic.svg', disabled: true },
]

function VinylTurntable() {
  return (
    <div className="relative inline-grid place-items-start">
      <div className="animate-vinyl-spin col-start-1 row-start-1 mt-[10px] inline-grid place-items-start">
        <img src="/assets/vinyl-outer.svg" alt="" className="col-start-1 row-start-1 size-[132px]" />
        <img src="/assets/vinyl-ring1.svg" alt="" className="col-start-1 row-start-1 ml-[7px] mt-[7px] size-[118px]" />
        <img src="/assets/vinyl-ring2.svg" alt="" className="col-start-1 row-start-1 ml-[14px] mt-[14px] size-[103px]" />
        <img src="/assets/vinyl-ring3.svg" alt="" className="col-start-1 row-start-1 ml-[22px] mt-[22px] size-[87px]" />
        <img src="/assets/vinyl-center.svg" alt="" className="col-start-1 row-start-1 ml-[29px] mt-[29px] size-[74px]" />
      </div>
      <div className="col-start-1 row-start-1 ml-[84px] mt-[22.83px] flex h-[114px] w-[54px] items-center justify-center">
        <img src="/assets/vinyl-arm.svg" alt="" className="h-[113px] w-[20px] rotate-[18deg]" />
      </div>
      <img src="/assets/vinyl-note.svg" alt="" className="animate-note-float col-start-1 row-start-1 ml-[115px] mt-[2px] h-[17px] w-[15px]" />
    </div>
  )
}

export function PlatformScreen({ onBack, onNext, loading = false }: PlatformScreenProps) {
  const [selected, setSelected] = useState<Platform>(null)

  return (
    <ScreenLayout onBack={onBack}>
      <ScreenHeader title="옮길 플랫폼을 선택해주세요" subtitle="플레이리스트를 생성할 플랫폼 선택이 필요해요" />

      <div className="flex w-full shrink-0 flex-col items-center gap-[var(--spacing-20)]">
        <VinylTurntable />
        <div className="flex w-full gap-[var(--spacing-16)]">
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.id} icon={p.icon} label={p.label} selected={selected === p.id} disabled={p.disabled} onClick={() => setSelected(p.id)} />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <PrimaryButton
        variant={selected ? 'primary' : 'disabled'}
        disabled={!selected}
        loading={loading}
        onClick={() => selected && onNext(selected)}
      >
        다음
      </PrimaryButton>
    </ScreenLayout>
  )
}
