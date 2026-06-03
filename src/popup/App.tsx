import { useEffect, useState } from 'react'

// 팝업 UI. chrome.storage와 연동해 카운터 상태를 유지하는 예제입니다.
export function App() {
  const [count, setCount] = useState(0)

  // 마운트 시 저장된 값을 불러옵니다.
  useEffect(() => {
    chrome.storage.local.get('count').then((res) => {
      if (typeof res.count === 'number') setCount(res.count)
    })
  }, [])

  // 값이 바뀔 때마다 저장합니다.
  const increment = async () => {
    const next = count + 1
    setCount(next)
    await chrome.storage.local.set({ count: next })
  }

  const openOptions = () => chrome.runtime.openOptionsPage()

  return (
    <main className="popup">
      <h1>🧩 Muma Client</h1>
      <p className="subtitle">CRXJS + React + Vite 스타터</p>

      <button className="counter" onClick={increment}>
        클릭 수: {count}
      </button>

      <button className="link" onClick={openOptions}>
        옵션 페이지 열기 →
      </button>
    </main>
  )
}
