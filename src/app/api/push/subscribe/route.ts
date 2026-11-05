import { pushMissing } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentUserId } from '@/lib/supabase/user'

type Body = {
  subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  timeZone?: unknown
}

/** POST /api/push/subscribe { subscription, timeZone } → saves this device for reminders. */
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  if (pushMissing().length) {
    return Response.json({ error: `Server needs ${pushMissing().join(', ')}` }, { status: 500 })
  }
  const body = (await request.json().catch(() => null)) as Body | null
  const { endpoint, keys } = body?.subscription ?? {}
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys?.auth !== 'string'
  ) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      endpoint,
      user_id: userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    },
    { onConflict: 'endpoint' },
  )
  if (error) return Response.json({ error: error.message }, { status: 500 })
  // The 10:15 morning reminder uses the user's own time zone.
  if (typeof body?.timeZone === 'string' && body.timeZone.length < 64) {
    await admin.from('profiles').update({ timezone: body.timeZone }).eq('id', userId)
  }
  return Response.json({ ok: true })
}

/** DELETE /api/push/subscribe { endpoint } → stops reminders on this device. */
export async function DELETE(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null
  if (typeof body?.endpoint !== 'string') {
    return Response.json({ error: 'Missing endpoint' }, { status: 400 })
  }
  await createAdminClient()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('user_id', userId)
  return Response.json({ ok: true })
}
