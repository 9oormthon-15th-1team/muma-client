import { useState, useEffect, useRef } from 'react'
import { ScreenLayout, ScreenHeader, CheckCircle } from '../../components/ui'

interface LoadingScreenProps {
  onBack: () => void
  progress: number
  statusMessage: string
  steps: { label: string; done: boolean }[]
}

function useAnimatedCount(target: number) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    const start = current
    const startTime = performance.now()
    const duration = 400

    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      setCurrent(Math.round(start + (target - start) * t))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target])

  return current
}

function VinylLoading({ progress }: { progress: number }) {
  const displayed = useAnimatedCount(progress)

  return (
    <div className="relative size-[132px]">
      {/* Spinning LP disc (inline SVG — orange highlight arcs spread to top/right/bottom/left
          so the whole disc reads as rotating, not just one half) */}
      <svg
        className="animate-vinyl-spin absolute inset-0 size-[132px]"
        viewBox="0 0 132 132"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="66" cy="66" r="66" fill="#343A3A" />
        <circle cx="66" cy="66" r="58.8" stroke="#424848" strokeWidth="0.5" />
        <circle cx="66" cy="66" r="51.3" stroke="#424848" strokeWidth="0.5" />
        <circle cx="66" cy="66" r="43.3" stroke="#424848" strokeWidth="0.5" />
        <circle cx="66" cy="66" r="37" stroke="#424848" strokeWidth="0.5" />
        <path d="M15.08 36.6 A58.8 58.8 0 0 1 116.92 36.6" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M91.65 21.57 A51.3 51.3 0 0 1 91.65 110.43" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M103.5 87.65 A43.3 43.3 0 0 1 28.5 87.65" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M47.5 98.04 A37 37 0 0 1 47.5 33.96" stroke="#FF6F21" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="66" cy="66" r="32" fill="#4B5250" />
        <circle cx="66" cy="66" r="29.59" fill="#F16B22" />
      </svg>
      {/* Static progress percentage */}
      <span className="absolute inset-0 flex items-center justify-center text-heading-2 text-[#424848]">
        {displayed}%
      </span>
    </div>
  )
}

export function LoadingScreen({ onBack, progress, statusMessage, steps }: LoadingScreenProps) {
  return (
    <ScreenLayout onBack={onBack}>
      <ScreenHeader title="플레이리스트를 불러오는 중이에요" subtitle="멜론 계정에 저장된 플레이리스트를 확인하고 있어요." />

      <div className="flex w-full shrink-0 justify-center">
        <VinylLoading progress={progress} />
      </div>

      {/* Progress */}
      <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-4)]">
        <div className="h-1 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)]">
          <div className="h-1 rounded-[var(--radius-full)] bg-[var(--color-brand-primary)] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
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
        <span className="animate-blink loading-dots text-body text-[var(--color-bg-secondary)]">잠시만 기다려주세요</span>
      </div>
    </ScreenLayout>
  )
}
