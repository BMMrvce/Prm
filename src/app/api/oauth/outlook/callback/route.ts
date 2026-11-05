import { NextResponse, type NextRequest } from 'next/server'
import { isSpaceKey } from '@/data/workspaces'
import { connectOutlook, outlookCallbackUrl } from '@/lib/mail/outlook'
import { finishOAuth } from '@/lib/oauth-state'
import { currentUserId } from '@/lib/supabase/user'

/** GET /api/oauth/outlook/callback → Microsoft redirects here; saves the mailbox for this user. */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams
  const flow = await finishOAuth(request, 'outlook')
  const back = new URL(flow?.next ?? '/office', request.nextUrl.origin)
  const finish = (result: string, message?: string) => {
    back.searchParams.set('mail', result)
    if (message) back.searchParams.set('message', message)
    return NextResponse.redirect(back)
  }

  if (search.get('error')) {
    return finish('error', search.get('error_description') || search.get('error')!)
  }
  const code = search.get('code')
  const space = flow?.purpose.slice(5) ?? ''
  if (!code || !flow || !isSpaceKey(space)) {
    return finish('error', 'Sign-in expired or was tampered with. Please try again.')
  }
  const userId = await currentUserId()
  if (!userId) return finish('error', 'Your Workbench session ended. Sign in and try again.')
  try {
    await connectOutlook(userId, space, code, outlookCallbackUrl(request.nextUrl.origin))
  } catch (error) {
    return finish(
      'error',
      error instanceof Error ? error.message : 'Could not finish Outlook sign-in.',
    )
  }
  return finish('connected')
}
