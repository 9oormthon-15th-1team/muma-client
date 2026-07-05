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
    <main className="mx-auto my-10 flex max-w-[420px] flex-col gap-4 px-5">
      <h1 className="text-xl font-bold">muma 설정</h1>
      <label className="flex flex-col gap-1.5 text-sm">
        <span>사용자 이름</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="이름을 입력하세요"
          className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm"
        />
      </label>
      <button
        onClick={save}
        className="cursor-pointer rounded-lg bg-indigo-500 p-2.5 text-sm font-semibold text-white"
      >
        {saved ? '저장됨 ✓' : '저장'}
      </button>
    </main>
  )
}
