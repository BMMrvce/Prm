import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/** Web Push to every browser or installed app where a user turned notifications on. */
const REQUIRED = ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'] as const

export type PushPayload = {
  title: string
  body: string
  /** Opened when the notification is clicked. */
  url: string
  /** Notifications with the same tag replace each other. */
  tag: string
}

export function pushMissing() {
  return REQUIRED.filter((name) => !process.env[name])
}

let configured = false

function configure() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || process.env.SITE_URL || 'https://example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  configured = true
}

type SubscriptionRow = { endpoint: string; user_id: string; p256dh: string; auth: string }

/** Sends to all of these users' devices; drops subscriptions the browser has revoked. */
export async function pushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length || pushMissing().length) return 0
  configure()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('endpoint,user_id,p256dh,auth')
    .in('user_id', userIds)
  if (error) throw new Error(error.message)
  let sent = 0
  await Promise.all(
    ((data ?? []) as SubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60, urgency: 'high' },
        )
        sent++
        await admin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('endpoint', row.endpoint)
      } catch (failure) {
        const status = (failure as { statusCode?: number }).statusCode
        // 404/410: the subscription expired or the user blocked notifications.
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
        } else {
          console.error('[push] send failed', status, (failure as Error).message)
        }
      }
    }),
  )
  return sent
}
