import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * Carries an OAuth round-trip's `state`, what the sign-in is for and where to return,
 * in a short-lived httpOnly cookie scoped to the provider's `/api/oauth/<name>` routes.
 */
const cookieName = (provider: string) => `${provider}_oauth_state`

/** Only same-site paths, so a callback can never redirect elsewhere. */
export const safeNext = (next: string | null, fallback: string) =>
  next && /^\/[a-z]/.test(next) && !next.startsWith('//') ? next : fallback

export async function startOAuth(
  request: NextRequest,
  provider: string,
  purpose: string,
  next: string,
) {
  const state = randomBytes(16).toString('hex')
  ;(await cookies()).set(cookieName(provider), [state, purpose, next].join('|'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: `/api/oauth/${provider}`,
    maxAge: 600,
  })
  return state
}

/** The purpose and return path of a callback, or null when the state does not match. */
export async function finishOAuth(request: NextRequest, provider: string) {
  const store = await cookies()
  const [state, purpose, next] = (store.get(cookieName(provider))?.value ?? '').split('|')
  store.delete({ name: cookieName(provider), path: `/api/oauth/${provider}` })
  const given = request.nextUrl.searchParams.get('state')
  return state && purpose && next && given === state ? { purpose, next } : null
}
