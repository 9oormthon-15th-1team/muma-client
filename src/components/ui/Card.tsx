import type { ReactNode } from 'react'

/** Stat card — small info card with label + value */
interface StatCardProps {
  label: string
  value: string
  filled?: boolean
  accent?: boolean
  icon?: ReactNode
}

export function StatCard({ label, value, filled, accent, icon }: StatCardProps) {
  return (
    <div
      className={`flex flex-1 flex-col gap-[var(--spacing-4)] rounded-[var(--radius-12)] border px-[var(--spacing-16)] py-[var(--spacing-12)] ${
        accent
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)]'
          : filled
            ? 'border-[var(--color-bg-secondary)] bg-[var(--color-bg-secondary)]'
            : 'border-[var(--color-bg-secondary)]'
      }`}
    >
      {icon}
      <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">{label}</span>
      <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
        {value}
      </span>
    </div>
  )
}

/** Platform selection card (Spotify / Youtube Music) */
interface PlatformCardProps {
  icon: string
  label: string
  selected: boolean
  onClick: () => void
}

export function PlatformCard({ icon, label, selected, onClick }: PlatformCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-[var(--spacing-4)] rounded-[var(--radius-12)] border p-[var(--spacing-16)] ${
        selected
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)]'
          : 'border-[var(--color-action-disabled)] bg-transparent'
      }`}
    >
      <img src={icon} alt="" className="size-6" />
      <span className="text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
        {label}
      </span>
    </button>
  )
}
