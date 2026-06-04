/** Back button (32x32) — glass surface */
export function IconBack({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass flex size-[var(--size-icon-lg)] cursor-pointer items-center justify-center rounded-[var(--radius-9)] border-none bg-[var(--color-bg-secondary)]"
    >
      <img src="/assets/icon-back.svg" alt="뒤로" className="size-[var(--size-icon-md)]" />
    </button>
  )
}

/** Expand/collapse button (32x32) — glass surface */
export function IconArrow({ expanded, onClick }: { expanded: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass flex size-[var(--size-icon-lg)] cursor-pointer items-center justify-center rounded-[var(--radius-9)] border-none bg-[var(--color-bg-secondary)]"
    >
      <img
        src={expanded ? '/assets/icon-chevron-down.svg' : '/assets/icon-chevron-up.svg'}
        alt=""
        className="size-[var(--size-icon-md)]"
      />
    </button>
  )
}

/** Playlist icon (inline SVG) */
export function IconPlaylist() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 5H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17.5 10H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 15H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="15" r="2" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

/** Song/music note icon (inline SVG) */
export function IconSong() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 15.833V4.167L16.667 2.5v11.667" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="15.833" r="2.5" stroke="white" strokeWidth="1.5" />
      <circle cx="14.167" cy="14.167" r="2.5" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

/** External link icon (inline SVG) */
export function IconExternalLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 10.833v4.167a1.667 1.667 0 01-1.667 1.667H5A1.667 1.667 0 013.333 15V6.667A1.667 1.667 0 015 5h4.167" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 2.5h5v5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.333 11.667L17.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
