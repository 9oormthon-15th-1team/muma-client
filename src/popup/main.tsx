import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SnackbarProvider } from '../components/ui'
import { App } from './App'
import '../index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SnackbarProvider>
      <App />
    </SnackbarProvider>
  </StrictMode>,
)
