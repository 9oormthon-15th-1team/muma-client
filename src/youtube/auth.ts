// Google(YouTube) OAuth 모듈 — spotify/auth.ts와 같은 구조.
// chrome.identity.getAuthToken 대신 launchWebAuthFlow를 쓰는 이유:
// getAuthToken은 Chrome 프로필 계정으로 고정되지만, launchWebAuthFlow는 매번
// Google 계정 선택창이 떠서 "옮기고 싶은 계정 ≠ Chrome 계정" 케이스를 지원한다.
const CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID as string
// Google 웹 클라이언트는 code 교환에 client_secret을 요구한다(installed app 관행상 기밀 아님).
const CLIENT_SECRET = import.meta.env.VITE_YOUTUBE_CLIENT_SECRET as string
const getRedirectUri = () => chrome.identity.getRedirectURL()
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['https://www.googleapis.com/auth/youtube']

const STORAGE_KEYS = {
  accessToken: 'youtube_access_token',
  refreshToken: 'youtube_refresh_token',
  expiresAt: 'youtube_expires_at',
} as const

// --- PKCE helpers ---

function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest('SHA-256', encoder.encode(plain))
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function createPKCEPair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64)
  const hashed = await sha256(verifier)
  const challenge = base64UrlEncode(hashed)
  return { verifier, challenge }
}

// --- Token storage ---

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

async function saveTokens(data: TokenData): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.accessToken]: data.accessToken,
    [STORAGE_KEYS.refreshToken]: data.refreshToken,
    [STORAGE_KEYS.expiresAt]: data.expiresAt,
  })
}

export async function getStoredTokens(): Promise<TokenData | null> {
  const result = await chrome.storage.local.get(Object.values(STORAGE_KEYS))
  const accessToken = result[STORAGE_KEYS.accessToken]
  const refreshToken = result[STORAGE_KEYS.refreshToken]
  const expiresAt = result[STORAGE_KEYS.expiresAt]

  if (!accessToken || !refreshToken || !expiresAt) return null
  return { accessToken, refreshToken, expiresAt }
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove(Object.values(STORAGE_KEYS))
}

// --- OAuth flow ---

export async function login(): Promise<TokenData> {
  const { verifier, challenge } = await createPKCEPair()
  const redirectUri = getRedirectUri()
  console.log('[youtube-auth] redirect_uri:', redirectUri)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    // refresh_token을 받으려면 offline + consent가 필요하고,
    // select_account로 매번 계정 선택창을 띄운다.
    access_type: 'offline',
    prompt: 'consent select_account',
  })

  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: `${AUTH_ENDPOINT}?${params.toString()}`,
    interactive: true,
  })

  if (!redirectUrl) {
    throw new Error('OAuth flow was cancelled')
  }

  const code = new URL(redirectUrl).searchParams.get('code')
  if (!code) {
    const error = new URL(redirectUrl).searchParams.get('error')
    throw new Error(`OAuth error: ${error ?? 'no code returned'}`)
  }
  console.log('[youtube-auth] authorization code received')

  const tokenData = await exchangeCodeForToken(code, verifier)
  await saveTokens(tokenData)
  return tokenData
}

async function exchangeCodeForToken(code: string, verifier: string): Promise<TokenData> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

export async function refreshAccessToken(): Promise<TokenData> {
  const stored = await getStoredTokens()
  if (!stored?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
    }),
  })

  if (!response.ok) {
    // OAuth 동의 화면이 Testing 모드면 refresh token이 7일 후 만료된다 — 재로그인 필요.
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json()
  const tokenData: TokenData = {
    accessToken: data.access_token,
    // Google은 refresh 응답에 refresh_token을 다시 주지 않는 것이 기본
    refreshToken: data.refresh_token ?? stored.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  await saveTokens(tokenData)
  return tokenData
}

export async function getValidAccessToken(): Promise<string> {
  const stored = await getStoredTokens()
  if (!stored) {
    throw new Error('Not logged in')
  }

  // 만료 1분 전에 미리 갱신
  if (Date.now() > stored.expiresAt - 60_000) {
    const refreshed = await refreshAccessToken()
    return refreshed.accessToken
  }

  return stored.accessToken
}
