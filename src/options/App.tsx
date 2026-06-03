import { useEffect, useState } from 'react'

// 옵션 페이지. 사용자 설정을 chrome.storage.sync에 저장하는 예제입니다.
export function App() {
  const [username, setUsername] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get('username').then((res) => {
      if (typeof res.username === 'string') setUsername(res.username)
    })
  }, [])

  const save = async () => {
    await chrome.storage.sync.set({ username })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <main className="options">
      <h1>Muma 설정</h1>
      <label className="field">
        <span>사용자 이름</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="이름을 입력하세요"
        />
      </label>
      <button onClick={save}>{saved ? '저장됨 ✓' : '저장'}</button>
    </main>
  )
}
