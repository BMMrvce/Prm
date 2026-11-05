import { timingSafeEqual } from 'node:crypto'
import { runReminders } from '@/lib/reminders'

/**
 * POST (or GET) /api/cron/reminders with `Authorization: Bearer $CRON_SECRET` → sends due
 * meeting, deadline and morning reminders. Called every minute by Supabase pg_cron
 * (supabase/reminders-cron.sql); public in the proxy, protected by the secret instead.
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!secret || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return Response.json({ ok: true, sent: await runReminders() })
  } catch (error) {
    console.error('[reminders] run failed', error)
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
