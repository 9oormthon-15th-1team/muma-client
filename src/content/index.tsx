import { createRoot } from 'react-dom/client'
import { Badge } from './Badge'

// 콘텐츠 스크립트: 매칭된 웹페이지에 React UI를 주입합니다.
// 호스트 페이지 스타일과 충돌을 피하기 위해 Shadow DOM에 마운트합니다.
const HOST_ID = 'muma-content-root'

function mount() {
  if (document.getElementById(HOST_ID)) return

  const host = document.createElement('div')
  host.id = HOST_ID
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const container = document.createElement('div')
  shadow.appendChild(container)

  createRoot(container).render(<Badge />)
}

mount()
