import { isSpaceKey } from '@/data/workspaces'
import { errorMessage, markMailRead, readMail } from '@/lib/mail'
import { currentUserId } from '@/lib/supabase/user'

type Context = { params: Promise<{ space: string }> }

/**
 * GET /api/mail/[space]/message?folder=inbox|sent&id=…[&peek=1] → one message with its body.
 * `peek=1` leaves it unread (used for prefetching; opening marks it read with POST).
 */
export async function GET(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const search = new URL(request.url).searchParams
  const id = search.get('id')
  if (!id) return Response.json({ error: 'Missing message id' }, { status: 400 })
  try {
    const folder = search.get('folder') === 'sent' ? 'sent' : 'inbox'
    const message = await readMail(userId, space, folder, id, search.get('peek') !== '1')
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })
    return Response.json(message)
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 })
  }
}

/** POST /api/mail/[space]/message with { folder, id } → marks that message read. */
export async function POST(request: Request, { params }: Context) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const input = (await request.json().catch(() => null)) as { folder?: string; id?: string } | null
  if (!input?.id) return Response.json({ error: 'Missing message id' }, { status: 400 })
  try {
    await markMailRead(userId, space, input.folder === 'sent' ? 'sent' : 'inbox', input.id)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 })
  }
}
