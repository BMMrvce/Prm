import { currentUserId } from '@/lib/supabase/user'
import { ReconnectRequired } from '@/lib/connections'
import { listPlaylists, youtubeErrorMessage } from '@/lib/youtube'

/** GET /api/youtube/playlists → the signed-in user's own YouTube playlists. */
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  try {
    return Response.json({ playlists: await listPlaylists(userId) })
  } catch (error) {
    const status = error instanceof ReconnectRequired ? 401 : 502
    return Response.json({ error: youtubeErrorMessage(error) }, { status })
  }
}
