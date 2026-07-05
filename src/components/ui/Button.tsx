import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'disabled' | 'outline'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** true면 스피너를 표시하고 클릭을 막는다 (진행 중 중복 클릭 방지) */
  loading?: boolean
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
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  // loading 중에는 버튼 색을 유지한 채 스피너만 보여준다 (disabled 스타일은 명시적 비활성일 때만)
  const resolved = disabled && !loading && variant !== 'outline' ? 'disabled' : variant

  return (
    <button
      disabled={disabled || loading}
      className={`flex h-[var(--size-button-height)] w-full shrink-0 items-center justify-center gap-1 rounded-[var(--radius-12)] text-body ${variantStyles[resolved]} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          aria-label="진행 중"
          className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      ) : (
        children
      )}
    </button>
  )
}
