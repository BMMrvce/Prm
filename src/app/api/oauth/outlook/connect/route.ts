import { NextResponse, type NextRequest } from 'next/server'
import { isSpaceKey } from '@/data/workspaces'
import { outlookAuthorizeUrl, outlookCallbackUrl, outlookMissing } from '@/lib/mail/outlook'
import { mailOptions } from '@/lib/mail/providers'
import { safeNext, startOAuth } from '@/lib/oauth-state'

/** GET /api/oauth/outlook/connect?space=office|studio&next=/path → Microsoft sign-in. */
export async function GET(request: NextRequest) {
  const missing = outlookMissing()
  if (missing.length) {
    return Response.json({ error: `Set ${missing.join(', ')} in .env` }, { status: 500 })
  }
  const search = request.nextUrl.searchParams
  const space = search.get('space') ?? ''
  if (!isSpaceKey(space) || !mailOptions(space).includes('outlook')) {
    return Response.json({ error: 'Outlook is not available for this workspace' }, { status: 400 })
  }
  const next = safeNext(search.get('next'), `/${space}/integrations`)
  const state = await startOAuth(request, 'outlook', `mail:${space}`, next)
  return NextResponse.redirect(
    outlookAuthorizeUrl(outlookCallbackUrl(request.nextUrl.origin), state),
  )
}
