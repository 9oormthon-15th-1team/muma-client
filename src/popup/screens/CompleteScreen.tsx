interface CompleteScreenProps {
  onBack: () => void
  playlistCount: number
  songCount: number
  totalSelected: number
  /** Spotify playlist URL to open (falls back to open.spotify.com) */
  spotifyUrl?: string
}

function PlaylistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 5H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17.5 10H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 15H2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="15" r="2" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

function SongIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 15.833V4.167L16.667 2.5v11.667" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="15.833" r="2.5" stroke="white" strokeWidth="1.5" />
      <circle cx="14.167" cy="14.167" r="2.5" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 10.833v4.167a1.667 1.667 0 01-1.667 1.667H5A1.667 1.667 0 013.333 15V6.667A1.667 1.667 0 015 5h4.167" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 2.5h5v5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.333 11.667L17.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VinylTurntable() {
  return (
    <div className="relative inline-grid place-items-start">
      <div className="col-start-1 row-start-1 mt-[10px] inline-grid place-items-start">
        <img src="/assets/vinyl-outer.svg" alt="" className="col-start-1 row-start-1 size-[132px]" />
        <img src="/assets/vinyl-ring1.svg" alt="" className="col-start-1 row-start-1 ml-[7px] mt-[7px] size-[118px]" />
        <img src="/assets/vinyl-ring2.svg" alt="" className="col-start-1 row-start-1 ml-[14px] mt-[14px] size-[103px]" />
        <img src="/assets/vinyl-ring3.svg" alt="" className="col-start-1 row-start-1 ml-[22px] mt-[22px] size-[87px]" />
        <img src="/assets/vinyl-center.svg" alt="" className="col-start-1 row-start-1 ml-[29px] mt-[29px] size-[74px]" />
      </div>
      <div className="col-start-1 row-start-1 ml-[84px] mt-[22.83px] flex h-[114px] w-[54px] items-center justify-center">
        <img src="/assets/vinyl-arm.svg" alt="" className="h-[113px] w-[20px] rotate-[18deg]" />
      </div>
      <img src="/assets/vinyl-note.svg" alt="" className="col-start-1 row-start-1 ml-[115px] mt-0 h-[17px] w-[15px]" />
    </div>
  )
}

export function CompleteScreen({
  onBack,
  playlistCount,
  songCount,
  totalSelected,
  spotifyUrl,
}: CompleteScreenProps) {
  function handleOpenSpotify() {
    const url = spotifyUrl || 'https://open.spotify.com'
    chrome.tabs.create({ url })
  }

  return (
    <div className="flex h-[600px] w-[380px] flex-col items-center gap-5 bg-[var(--color-bg-dark)] p-5">
      {/* Back */}
      <div className="w-full shrink-0">
        <button
          onClick={onBack}
          className="flex size-8 cursor-pointer items-center justify-center rounded-[9px] border-none bg-[var(--color-bg-secondary)]"
        >
          <img src="/assets/icon-back.svg" alt="뒤로" className="size-5" />
        </button>
      </div>

      {/* Header */}
      <div className="flex w-full shrink-0 flex-col gap-2">
        <h2 className="m-0 text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
          성공적으로 옮겼어요
        </h2>
        <p className="m-0 text-[13px] leading-[21px] text-[var(--color-brand-primary)]">
          Spotify에서 결과를 확인해보세요.
        </p>
      </div>

      {/* Vinyl turntable */}
      <VinylTurntable />

      {/* Progress info */}
      <div className="flex w-full shrink-0 flex-col gap-1">
        <div className="h-1 w-full rounded-full bg-[var(--color-brand-primary)]" />
        <p className="m-0 text-[12px] font-semibold leading-[18px] text-[#a0a0a0]">
          {playlistCount}개 플레이리스트 · {totalSelected}곡 선택됨
        </p>
      </div>

      {/* Result stats */}
      <div className="flex w-full shrink-0 gap-4">
        <div className="flex h-[104px] flex-1 flex-col gap-1 rounded-xl border border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)] p-4">
          <PlaylistIcon />
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">옮긴 플레이리스트</span>
          <span className="text-[17px] font-bold leading-[24px] text-[var(--color-text-inverse)]">
            {playlistCount}개
          </span>
        </div>
        <div className="flex h-[104px] flex-1 flex-col gap-1 rounded-xl border border-[var(--color-brand-primary)] bg-[var(--color-bg-secondary)] p-4">
          <SongIcon />
          <span className="text-[12px] leading-[18px] text-[var(--color-text-inverse)]">옮긴 곡</span>
          <span className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-inverse)]">
            {songCount}곡
          </span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleOpenSpotify}
        className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-1 rounded-xl border-none bg-[var(--color-brand-primary)] text-[15px] font-semibold text-[var(--color-text-inverse)]"
      >
        Spotify로 이동하기
        <ExternalLinkIcon />
      </button>
    </div>
  )
}
