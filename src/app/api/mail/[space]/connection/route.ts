import { isSpaceKey } from '@/data/workspaces'
import { connectHostinger, disconnectMail, errorMessage } from '@/lib/mail'
import { currentUserId } from '@/lib/supabase/user'

type Context = { params: Promise<{ space: string }> }

/**
 * POST /api/mail/[space]/connection { provider: 'hostinger', email, password } → signs in to
 * check the details, then saves them as your mailbox for that workspace. Gmail and Outlook
 * connect through /api/oauth/google/connect and /api/oauth/outlook/connect instead.
 */
export async function POST(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as {
    provider?: unknown
    email?: unknown
    password?: unknown
  } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (body?.provider !== 'hostinger') {
    return Response.json({ error: 'Unsupported provider' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return Response.json({ error: 'Enter the mailbox address and password.' }, { status: 400 })
  }
  try {
    await connectHostinger(userId, space, { user: email, pass: password })
    return Response.json({ ok: true })
  } catch (error) {
    const message = errorMessage(error)
    console.warn(`[mail] Hostinger connect for ${space} failed: ${message}`)
    return Response.json({ error: message }, { status: 400 })
  }
}

/** DELETE /api/mail/[space]/connection → forgets your mailbox for that workspace. */
export async function DELETE(_request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  await disconnectMail(userId, space)
  return Response.json({ ok: true })
}
