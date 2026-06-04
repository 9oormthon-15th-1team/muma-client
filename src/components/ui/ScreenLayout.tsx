import type { ReactNode } from 'react'
import { IconBack } from './Icons'

interface ScreenLayoutProps {
  children: ReactNode
  onBack?: () => void
  /** Use overflow-y-auto for scrollable content */
  scrollable?: boolean
}

export function ScreenLayout({ children, onBack, scrollable }: ScreenLayoutProps) {
  return (
    <div
      className={`screen-bg flex h-[var(--size-popup-height)] w-[var(--size-popup-width)] flex-col gap-[var(--spacing-20)] p-[var(--spacing-20)] ${
        scrollable ? 'overflow-y-auto' : ''
      }`}
    >
      {onBack && (
        <div className="w-full shrink-0">
          <IconBack onClick={onBack} />
        </div>
      )}
      {children}
    </div>
  )
}

interface ScreenHeaderProps {
  title: string
  subtitle: string
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-4)]">
      <h2 className="m-0 text-heading-2 text-[var(--color-text-inverse)]">
        {title}
      </h2>
      <p className="m-0 text-subtitle text-[var(--color-brand-primary)] opacity-90">
        {subtitle}
      </p>
    </div>
  )
}
