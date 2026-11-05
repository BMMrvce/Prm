import { isSpaceKey } from '@/data/workspaces'
import { errorMessage, readMail } from '@/lib/mail'
import { currentUserId } from '@/lib/supabase/user'

/** GET /api/mail/[space]/message?folder=inbox|sent&id=… → one message with its body. */
export async function GET(request: Request, { params }: { params: Promise<{ space: string }> }) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const search = new URL(request.url).searchParams
  const id = search.get('id')
  if (!id) return Response.json({ error: 'Missing message id' }, { status: 400 })
  try {
    const folder = search.get('folder') === 'sent' ? 'sent' : 'inbox'
    const message = await readMail(userId, space, folder, id)
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })
    return Response.json(message)
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 })
  }
}
