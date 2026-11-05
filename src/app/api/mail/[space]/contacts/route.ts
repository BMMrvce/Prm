import { isSpaceKey } from '@/data/workspaces'
import { errorMessage, listContacts } from '@/lib/mail'
import { currentUserId } from '@/lib/supabase/user'

/** GET /api/mail/[space]/contacts → people from your recent mail, for recipient suggestions. */
export async function GET(_request: Request, { params }: { params: Promise<{ space: string }> }) {
  const { space } = await params
  if (!isSpaceKey(space)) return Response.json({ error: 'Unknown workspace' }, { status: 404 })
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  try {
    return Response.json({ contacts: await listContacts(userId, space) })
  } catch (error) {
    return Response.json({ contacts: [], error: errorMessage(error) }, { status: 502 })
  }
}
