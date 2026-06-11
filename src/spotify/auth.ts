const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
const getRedirectUri = () => chrome.identity.getRedirectURL()
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
const SCOPES = ['playlist-modify-public', 'user-read-private']

const STORAGE_KEYS = {
  accessToken: 'spotify_access_token',
  refreshToken: 'spotify_refresh_token',
  expiresAt: 'spotify_expires_at',
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
  console.log('[spotify-auth] redirect_uri:', redirectUri)
  console.log('[spotify-auth] client_id:', CLIENT_ID)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`
  console.log('[spotify-auth] auth URL:', authUrl)

  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
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
  console.log('[spotify-auth] authorization code received')

  const tokenData = await exchangeCodeForToken(code, verifier)
  console.log('[spotify-auth] token data:', {
    accessToken: tokenData.accessToken.slice(0, 10) + '...',
    refreshToken: tokenData.refreshToken.slice(0, 10) + '...',
    expiresAt: new Date(tokenData.expiresAt).toISOString(),
  })
  await saveTokens(tokenData)
  return tokenData
}

async function exchangeCodeForToken(code: string, verifier: string): Promise<TokenData> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
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
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json()
  const tokenData: TokenData = {
    accessToken: data.access_token,
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
