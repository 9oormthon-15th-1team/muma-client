interface CheckCircleProps {
  checked: boolean
  size?: number
}

export function CheckCircle({ checked, size = 20 }: CheckCircleProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[10px] ${
        checked ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-secondary)]'
      }`}
      style={{ width: size, height: size }}
    >
      {checked && (
        <img src="/assets/icon-check.svg" alt="" style={{ width: size, height: size }} />
      )}
    </div>
  )
}
