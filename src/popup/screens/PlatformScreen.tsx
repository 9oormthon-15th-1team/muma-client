import { useState } from 'react'

type Platform = 'spotify' | 'ytmusic' | null

interface PlatformScreenProps {
  onBack: () => void
  onNext: (platform: 'spotify' | 'ytmusic') => void
}

const PLATFORMS = [
  { id: 'spotify' as const, label: 'Spotify', icon: '/assets/icon-spotify.svg' },
  { id: 'ytmusic' as const, label: 'Youtube music', icon: '/assets/icon-ytmusic.svg' },
]

function VinylTurntable() {
  return (
    <div className="relative inline-grid place-items-start">
      {/* Vinyl disc (offset down 10px for arm space) */}
      <div className="col-start-1 row-start-1 mt-[10px] inline-grid place-items-start">
        <img src="/assets/vinyl-outer.svg" alt="" className="col-start-1 row-start-1 size-[132px]" />
        <img src="/assets/vinyl-ring1.svg" alt="" className="col-start-1 row-start-1 ml-[7px] mt-[7px] size-[118px]" />
        <img src="/assets/vinyl-ring2.svg" alt="" className="col-start-1 row-start-1 ml-[14px] mt-[14px] size-[103px]" />
        <img src="/assets/vinyl-ring3.svg" alt="" className="col-start-1 row-start-1 ml-[22px] mt-[22px] size-[87px]" />
        <img src="/assets/vinyl-center.svg" alt="" className="col-start-1 row-start-1 ml-[29px] mt-[29px] size-[74px]" />
      </div>
      {/* Turntable arm */}
      <div className="col-start-1 row-start-1 ml-[84px] mt-[22.83px] flex h-[114px] w-[54px] items-center justify-center">
        <img src="/assets/vinyl-arm.svg" alt="" className="h-[113px] w-[20px] rotate-[18deg]" />
      </div>
      {/* Music note */}
      <img src="/assets/vinyl-note.svg" alt="" className="col-start-1 row-start-1 ml-[115px] mt-0 h-[17px] w-[15px]" />
    </div>
  )
}

export function PlatformScreen({ onBack, onNext }: PlatformScreenProps) {
  const [selected, setSelected] = useState<Platform>(null)

  return (
    <div className="flex h-[600px] w-[380px] flex-col gap-5 bg-[var(--color-bg-dark)] p-5">
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
          옮길 플랫폼을 선택해주세요
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[var(--color-brand-primary)]">
          플레이리스트를 생성할 플랫폼 선택이 필요해요
        </p>
      </div>

      {/* Vinyl turntable illustration */}
      <div className="flex w-full shrink-0 flex-col items-center gap-5">
        <VinylTurntable />

        {/* Platform cards */}
        <div className="flex w-full gap-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border p-4 ${
                selected === p.id
                  ? 'border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)]'
                  : 'border-[#a0a0a0] bg-transparent'
              }`}
            >
              <img src={p.icon} alt="" className="size-6" />
              <span className="text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA */}
      <button
        disabled={!selected}
        onClick={() => selected && onNext(selected)}
        className={`flex h-12 w-full shrink-0 items-center justify-center rounded-xl border-none text-[15px] font-semibold text-[var(--color-text-inverse)] ${
          selected
            ? 'cursor-pointer bg-[var(--color-brand-primary)]'
            : 'bg-[var(--color-bg-secondary)]'
        }`}
      >
        다음
      </button>
    </div>
  )
}
