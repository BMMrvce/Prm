import { NextResponse, type NextRequest } from 'next/server'
import { googleAuthorizeUrl, googleCallbackUrl, googleMissing, GOOGLE_SCOPES } from '@/lib/google'
import { mailOptions } from '@/lib/mail/providers'
import { safeNext, startOAuth } from '@/lib/oauth-state'
import { isSpaceKey } from '@/data/workspaces'

/**
 * GET /api/oauth/google/connect?purpose=youtube|mail:<space>&next=/path → Google sign-in.
 * Gmail can only be connected to a workspace that allows it.
 */
export async function GET(request: NextRequest) {
  const missing = googleMissing()
  if (missing.length) {
    return Response.json({ error: `Set ${missing.join(', ')} in .env` }, { status: 500 })
  }
  const search = request.nextUrl.searchParams
  const purpose = search.get('purpose') ?? ''
  const space = purpose.startsWith('mail:') ? purpose.slice(5) : null
  if (
    purpose !== 'youtube' &&
    !(space && isSpaceKey(space) && mailOptions(space).includes('gmail'))
  ) {
    return Response.json({ error: 'Unknown purpose' }, { status: 400 })
  }
  const next = safeNext(search.get('next'), space ? `/${space}/integrations` : '/personal')
  const state = await startOAuth(request, 'google', purpose, next)
  const scope =
    purpose === 'youtube' ? GOOGLE_SCOPES.youtube : `openid email ${GOOGLE_SCOPES.gmail}`
  return NextResponse.redirect(
    googleAuthorizeUrl(googleCallbackUrl(request.nextUrl.origin), state, scope),
  )
}
