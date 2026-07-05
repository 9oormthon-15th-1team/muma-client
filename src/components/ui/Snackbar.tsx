import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// 표시 시간/퇴장 애니메이션 길이 — index.css의 animate-snackbar-out 길이와 맞춘다.
const SNACKBAR_DURATION_MS = 3000
const SNACKBAR_EXIT_MS = 240

interface SnackbarContextValue {
  /** 하단 스낵바로 한 줄 메시지를 띄운다. 연속 호출 시 메시지를 교체하고 타이머를 리셋한다. */
  showSnackbar: (message: string) => void
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null)

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider')
  return ctx
}

interface SnackbarState {
  message: string
  /** 같은 메시지가 연속으로 와도 진입 애니메이션을 다시 재생하기 위한 키 */
  key: number
  exiting: boolean
}

function IconSnackbarError() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="#FF5A46" />
      <rect x="8" y="4" width="2" height="7" rx="1" fill="white" />
      <circle cx="9" cy="13.5" r="1.2" fill="white" />
    </svg>
  )
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const timers = useRef<{ hide?: number; remove?: number }>({})

  const showSnackbar = useCallback((message: string) => {
    window.clearTimeout(timers.current.hide)
    window.clearTimeout(timers.current.remove)
    setSnackbar((prev) => ({ message, key: (prev?.key ?? 0) + 1, exiting: false }))
    timers.current.hide = window.setTimeout(() => {
      setSnackbar((prev) => (prev ? { ...prev, exiting: true } : null))
      timers.current.remove = window.setTimeout(() => setSnackbar(null), SNACKBAR_EXIT_MS)
    }, SNACKBAR_DURATION_MS)
  }, [])

  useEffect(() => {
    const t = timers.current
    return () => {
      window.clearTimeout(t.hide)
      window.clearTimeout(t.remove)
    }
  }, [])

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {snackbar && (
        <div
          key={snackbar.key}
          role="status"
          className={`pointer-events-none fixed inset-x-[var(--spacing-20)] bottom-[var(--spacing-20)] z-50 ${
            snackbar.exiting ? 'animate-snackbar-out' : 'animate-snackbar-in'
          }`}
        >
          <div className="flex items-center gap-[var(--spacing-8)] rounded-[var(--radius-12)] bg-[var(--color-snackbar-bg)] px-[var(--spacing-16)] py-[var(--spacing-12)] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <IconSnackbarError />
            <p className="m-0 truncate text-[13px] font-medium leading-[18px] text-[var(--color-text-inverse)]">
              {snackbar.message}
            </p>
          </div>
        </div>
      )}
    </SnackbarContext.Provider>
  )
}
