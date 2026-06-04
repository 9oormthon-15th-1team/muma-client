interface SelectionBadgeProps {
  count: number
}

export function SelectionBadge({ count }: SelectionBadgeProps) {
  if (count === 0) return null

  return (
    <span className="text-body-small-bold text-[var(--color-brand-primary)]">
      {count}개 선택됨
    </span>
  )
}
