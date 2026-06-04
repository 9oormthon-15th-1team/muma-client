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
    'border border-[var(--color-bg-secondary)] bg-transparent text-[var(--color-bg-secondary)]',
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
      className={`flex h-[var(--size-button-height)] w-full shrink-0 items-center justify-center gap-1 rounded-[var(--radius-12)] border-none text-[15px] font-semibold leading-[22px] ${variantStyles[resolved]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
