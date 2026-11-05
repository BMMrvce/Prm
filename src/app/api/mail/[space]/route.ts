import { isSpaceKey } from '@/data/workspaces'
import { errorMessage, listMail, sendMail } from '@/lib/mail'
import type { SendMailInput } from '@/lib/mail/types'
import { currentUserId } from '@/lib/supabase/user'

type Context = { params: Promise<{ space: string }> }

/** GET /api/mail/[space]?folder=inbox|sent → latest messages in your mailbox for that workspace. */
export async function GET(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const folder = new URL(request.url).searchParams.get('folder') === 'sent' ? 'sent' : 'inbox'
  return Response.json(await listMail(userId, space, folder))
}

/** POST /api/mail/[space] with { to, subject, body } → sends from your mailbox for that workspace. */
export async function POST(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const input = (await request.json().catch(() => null)) as Partial<SendMailInput> | null
  const to = input?.to?.trim()
  if (!to || !/^[^\s@,]+@[^\s@,]+(\s*,\s*[^\s@,]+@[^\s@,]+)*$/.test(to)) {
    return Response.json({ error: 'Enter one or more valid email addresses.' }, { status: 400 })
  }
  try {
    await sendMail(userId, space, {
      to,
      subject: input?.subject?.trim() ?? '',
      body: input?.body ?? '',
    })
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 })
  }
}
