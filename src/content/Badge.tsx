import { useState } from 'react'

// 페이지 우하단에 떠 있는 작은 플로팅 배지 예제.
// 스타일은 Shadow DOM 안에서 인라인으로 격리됩니다.
export function Badge() {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 2147483647,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: 8,
            padding: '10px 14px',
            background: '#111827',
            color: '#fff',
            borderRadius: 10,
            fontSize: 13,
            maxWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          이 패널은 콘텐츠 스크립트가 주입한 React 컴포넌트입니다.
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: '#6366f1',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
        }}
        aria-label="Muma 토글"
      >
        🧩
      </button>
    </div>
  )
}
