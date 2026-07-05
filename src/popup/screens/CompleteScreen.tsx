import { useRef } from 'react'
import type { TargetPlatform } from '../../lib/types'
import { PLATFORM_HOME_URLS, PLATFORM_LABELS } from '../../lib/platform'
import { PrimaryButton, IconPlaylist, IconSong, IconExternalLink, StatCard, ScreenLayout, ScreenHeader } from '../../components/ui'

interface CompleteScreenProps {
  onBack: () => void
  platform: TargetPlatform
  playlistCount: number
  songCount: number
  totalSelected: number
  /** 생성된 플레이리스트 URL — 없으면 플랫폼 홈을 연다 */
  resultUrl?: string
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
      <img src="/assets/vinyl-note.svg" alt="" className="animate-note-float col-start-1 row-start-1 ml-[115px] mt-[2px] h-[17px] w-[15px]" />
    </div>
  )
}

export function CompleteScreen({ onBack, platform, playlistCount, songCount, totalSelected, resultUrl }: CompleteScreenProps) {
  const platformLabel = PLATFORM_LABELS[platform]
  // 연타 시 탭이 여러 개 열리는 것을 방지
  const openInFlight = useRef(false)

  function handleOpenResult() {
    if (openInFlight.current) return
    openInFlight.current = true
    void chrome.tabs
      .create({ url: resultUrl || PLATFORM_HOME_URLS[platform] })
      .finally(() => {
        openInFlight.current = false
      })
  }

  return (
    <ScreenLayout onBack={onBack}>
      <ScreenHeader title="성공적으로 옮겼어요" subtitle={`${platformLabel}에서 결과를 확인해보세요.`} />

      <div className="flex w-full shrink-0 justify-center">
        <VinylTurntable />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-4)]">
        <div className="h-1 w-full rounded-[var(--radius-full)] bg-[var(--color-brand-primary)]" />
        <p className="m-0 text-body-small-bold text-[var(--color-action-disabled)]">
          {playlistCount}개 플레이리스트 · {totalSelected}곡 선택됨
        </p>
      </div>

      <div className="flex w-full shrink-0 gap-[var(--spacing-16)]">
        <StatCard label="옮긴 플레이리스트" value={`${playlistCount}개`} accent icon={<IconPlaylist />} />
        <StatCard label="옮긴 곡" value={`${songCount}곡`} accent icon={<IconSong />} />
      </div>

      <PrimaryButton onClick={handleOpenResult}>
        {platformLabel}로 이동하기
        <IconExternalLink />
      </PrimaryButton>
    </ScreenLayout>
  )
}
