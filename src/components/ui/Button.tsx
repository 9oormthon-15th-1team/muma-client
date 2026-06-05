import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'disabled' | 'outline'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'cursor-pointer bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)]',
  disabled:
    'bg-[var(--color-bg-secondary)] text-[var(--color-text-inverse)]',
  outline:
    'cursor-pointer glass border border-[var(--color-bg-secondary)] bg-[var(--color-glass)] text-[var(--color-text-inverse)]',
}

export function PrimaryButton({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  const resolved = disabled && variant !== 'outline' ? 'disabled' : variant

  return (
    <button
      disabled={disabled}
      className={`flex h-[var(--size-button-height)] w-full shrink-0 items-center justify-center gap-1 rounded-[var(--radius-12)] text-body ${variantStyles[resolved]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
