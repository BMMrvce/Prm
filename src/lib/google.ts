import { providerFetch, type TokenGrant } from './connections'

/** Google OAuth 2.0 (authorization code) shared by YouTube and Gmail; one web client. */
const REQUIRED = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_TOKEN_ENCRYPTION_KEY'] as const
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const GOOGLE_SCOPES = {
  youtube: 'https://www.googleapis.com/auth/youtube.readonly',
  // Read, mark read and send. All Gmail read scopes are "restricted" for Google review.
  gmail: 'https://www.googleapis.com/auth/gmail.modify',
} as const

export function googleMissing() {
  return REQUIRED.filter((name) => !process.env[name])
}

export function googleCallbackUrl(origin: string) {
  return `${process.env.SITE_URL || origin}/api/oauth/google/callback`
}

export function googleAuthorizeUrl(redirectUri: string, state: string, scope: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    state,
    // Offline access + consent so Google always returns a refresh token.
    access_type: 'offline',
    prompt: 'consent select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export const googleFetch = (url: string, init?: RequestInit) => providerFetch('Google', url, init)

export async function requestGoogleToken(grant: Record<string, string>): Promise<TokenGrant> {
  const response = await googleFetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      ...grant,
    }),
  })
  const data = (await response.json()) as Partial<TokenGrant> & {
    error?: string
    error_description?: string
  }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token request failed')
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in ?? 3600,
  }
}

export const refreshGoogleToken = (refreshToken: string) =>
  requestGoogleToken({ grant_type: 'refresh_token', refresh_token: refreshToken })

export const exchangeGoogleCode = (code: string, redirectUri: string) =>
  requestGoogleToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
