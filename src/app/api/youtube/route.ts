import { currentUserId } from '@/lib/supabase/user'
import { ReconnectRequired } from '@/lib/connections'
import {
  choosePlaylist,
  disconnectYouTube,
  listVideos,
  youtubeErrorMessage,
  youtubeStatus,
} from '@/lib/youtube'

/** GET /api/youtube → connection status and, once a playlist is chosen, its videos. */
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const status = await youtubeStatus(userId)
  if (status.state !== 'connected') return Response.json({ status, videos: [] })
  try {
    return Response.json({ status, videos: await listVideos(userId) })
  } catch (error) {
    if (error instanceof ReconnectRequired) {
      return Response.json({ status: { state: 'needs_auth' }, videos: [] })
    }
    return Response.json({ status, videos: [], error: youtubeErrorMessage(error) }, { status: 502 })
  }
}

/** POST /api/youtube { playlistId } → chooses the playlist shown on the dashboard. */
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { playlistId?: unknown } | null
  if (typeof body?.playlistId !== 'string' || !body.playlistId) {
    return Response.json({ error: 'Choose a playlist.' }, { status: 400 })
  }
  try {
    await choosePlaylist(userId, body.playlistId)
    return Response.json({ ok: true })
  } catch (error) {
    const status = error instanceof ReconnectRequired ? 401 : 400
    return Response.json({ error: youtubeErrorMessage(error) }, { status })
  }
}

/** DELETE /api/youtube → forgets this user's YouTube sign-in. */
export async function DELETE() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  await disconnectYouTube(userId)
  return Response.json({ ok: true })
}
