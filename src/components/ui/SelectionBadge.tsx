interface SelectionBadgeProps {
  count: number
}

export function SelectionBadge({ count }: SelectionBadgeProps) {
  if (count === 0) return null

  return (
    <span className="text-[12px] font-semibold leading-[18px] text-[var(--color-brand-primary)]">
      {count}개 선택됨
    </span>
  )
}
