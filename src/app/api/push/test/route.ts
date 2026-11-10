import { pushToUsers } from '@/lib/push'
import { currentUserId } from '@/lib/supabase/user'

/** POST /api/push/test → sends a test notification to all of your devices. */
export async function POST() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const sent = await pushToUsers([userId], {
      title: 'ಸKala² reminders are on',
      body: 'You will be reminded 10 min before meetings, 1 hour before deadlines and at 10:15 each morning.',
      url: '/',
      tag: 'test',
    })
    return Response.json({ sent })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
