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
      className={`glass flex flex-1 flex-col gap-[var(--spacing-4)] rounded-[var(--radius-12)] border px-[var(--spacing-16)] py-[var(--spacing-12)] ${
        accent
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)]'
          : filled
            ? 'border-[var(--color-bg-secondary)] bg-[var(--color-bg-secondary)]'
            : 'border-[var(--color-bg-secondary)] bg-[var(--color-glass)]'
      }`}
    >
      {icon}
      <span className="text-body-small text-[var(--color-text-inverse)]">{label}</span>
      <span className="text-body text-[var(--color-text-inverse)]">
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
  disabled?: boolean
  onClick: () => void
}

export function PlatformCard({ icon, label, selected, disabled, onClick }: PlatformCardProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`glass flex flex-1 flex-col items-center justify-center gap-[var(--spacing-4)] rounded-[var(--radius-12)] border p-[var(--spacing-16)] ${
        disabled
          ? 'cursor-not-allowed border-[var(--color-action-disabled)] bg-[var(--color-glass)] opacity-40'
          : selected
            ? 'cursor-pointer border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)]'
            : 'cursor-pointer border-[var(--color-action-disabled)] bg-[var(--color-glass)]'
      }`}
    >
      <img src={icon} alt="" className="size-6" />
      <span className="text-heading-2 text-[var(--color-text-inverse)]">
        {label}
      </span>
    </button>
  )
}
