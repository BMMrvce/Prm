import { SPACE_KEYS } from '@/data/workspaces'
import { mailStatus } from '@/lib/mail'
import { currentUserId } from '@/lib/supabase/user'

/** GET /api/mail → the signed-in user's mailbox status for every workspace. */
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const entries = await Promise.all(
    SPACE_KEYS.map(async (space) => [space, await mailStatus(userId, space)]),
  )
  return Response.json(Object.fromEntries(entries))
}
