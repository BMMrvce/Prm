import { NextResponse, type NextRequest } from 'next/server'
import { isSpaceKey } from '@/data/workspaces'
import { exchangeGoogleCode, googleCallbackUrl } from '@/lib/google'
import { connectGmail } from '@/lib/mail/gmail'
import { finishOAuth } from '@/lib/oauth-state'
import { currentUserId } from '@/lib/supabase/user'
import { connectYouTube } from '@/lib/youtube'

/** GET /api/oauth/google/callback → Google redirects here; stores the grant for this user. */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams
  const flow = await finishOAuth(request, 'google')
  const purpose = flow?.purpose ?? ''
  // ?youtube=… for the Watch Later card, ?mail=… for a workspace mailbox.
  const param = purpose === 'youtube' ? 'youtube' : 'mail'
  const back = new URL(flow?.next ?? '/office', request.nextUrl.origin)
  const finish = (result: string, message?: string) => {
    back.searchParams.set(param, result)
    if (message) back.searchParams.set('message', message)
    return NextResponse.redirect(back)
  }

  if (search.get('error')) {
    return finish('error', search.get('error_description') || search.get('error')!)
  }
  const code = search.get('code')
  if (!code || !flow)
    return finish('error', 'Sign-in expired or was tampered with. Please try again.')
  const userId = await currentUserId()
  if (!userId) return finish('error', 'Your ಸKala² session ended. Sign in and try again.')
  try {
    const grant = await exchangeGoogleCode(code, googleCallbackUrl(request.nextUrl.origin))
    if (purpose === 'youtube') {
      await connectYouTube(userId, grant)
    } else {
      const space = purpose.slice(5)
      if (!isSpaceKey(space)) return finish('error', 'Unknown workspace.')
      await connectGmail(userId, space, grant)
    }
  } catch (error) {
    return finish(
      'error',
      error instanceof Error ? error.message : 'Could not finish Google sign-in.',
    )
  }
  return finish('connected')
}
