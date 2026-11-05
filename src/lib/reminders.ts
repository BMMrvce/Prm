import { createAdminClient } from '@/lib/supabase/admin'
import { pushToUsers, type PushPayload } from './push'

/**
 * The every-minute reminder job (called by Supabase pg_cron through /api/cron/reminders):
 * - meetings starting within the next 10 minutes,
 * - open tasks due within the next hour,
 * - at 10:15 in each user's time zone, the tasks due that day.
 * Each reminder is claimed in `reminder_deliveries` first, so it is sent once per user even
 * though the job runs every minute. Every reminder also lands in the in-app bell.
 */
const MEETING_LEAD_MS = 10 * 60_000
const DEADLINE_LEAD_MS = 60 * 60_000
const DIGEST_HOUR = 10
const DIGEST_MINUTE = 15
/** Minutes after 10:15 the digest may still go out if the scheduler was late. */
const DIGEST_GRACE_MINUTES = 30

type Admin = ReturnType<typeof createAdminClient>
type Row = Record<string, any>

const one = (value: Row | Row[] | null | undefined) => (Array.isArray(value) ? value[0] : value)
const spaceOf = (slug: string | undefined) => slug?.split('-')[0] || 'office'
const minutesUntil = (iso: string, now: Date) =>
  Math.max(1, Math.round((new Date(iso).getTime() - now.getTime()) / 60_000))

type InApp = { workspaceId: string; type: string; data: Row }

/** Claims `key` for each user, then notifies only the users it was newly claimed for. */
async function deliver(
  admin: Admin,
  userIds: string[],
  key: string,
  payload: PushPayload,
  inApp: InApp,
) {
  const unique = [...new Set(userIds)]
  if (!unique.length) return 0
  const { data, error } = await admin
    .from('reminder_deliveries')
    .upsert(
      unique.map((user_id) => ({ user_id, key })),
      { onConflict: 'user_id,key', ignoreDuplicates: true },
    )
    .select('user_id')
  if (error) throw new Error(error.message)
  const claimed = (data ?? []).map((row) => row.user_id as string)
  if (!claimed.length) return 0
  await admin.from('notifications').insert(
    claimed.map((user_id) => ({
      workspace_id: inApp.workspaceId,
      user_id,
      type: inApp.type,
      title: payload.title,
      body: payload.body,
      data: { ...inApp.data, url: payload.url },
    })),
  )
  await pushToUsers(claimed, payload)
  return claimed.length
}

async function membersOf(admin: Admin, workspaceIds: string[]) {
  const byWorkspace = new Map<string, string[]>()
  if (!workspaceIds.length) return byWorkspace
  const { data, error } = await admin
    .from('workspace_members')
    .select('workspace_id,user_id')
    .in('workspace_id', [...new Set(workspaceIds)])
    .eq('status', 'active')
  if (error) throw new Error(error.message)
  for (const row of data ?? []) {
    byWorkspace.set(row.workspace_id, [...(byWorkspace.get(row.workspace_id) ?? []), row.user_id])
  }
  return byWorkspace
}

async function meetingReminders(admin: Admin, now: Date) {
  const { data, error } = await admin
    .from('meetings')
    .select('id,title,starts_at,meeting_url,workspace_id,workspace:workspaces(slug)')
    .gt('starts_at', now.toISOString())
    .lte('starts_at', new Date(now.getTime() + MEETING_LEAD_MS).toISOString())
  if (error) throw new Error(error.message)
  const members = await membersOf(
    admin,
    (data ?? []).map((row) => row.workspace_id),
  )
  let sent = 0
  for (const meeting of (data ?? []) as Row[]) {
    const space = spaceOf(one(meeting.workspace)?.slug)
    const minutes = minutesUntil(meeting.starts_at, now)
    sent += await deliver(
      admin,
      members.get(meeting.workspace_id) ?? [],
      `meeting:${meeting.id}:${meeting.starts_at}`,
      {
        title: `${meeting.title} starts in ${minutes} min`,
        body: meeting.meeting_url ? 'Tap to join the meeting.' : 'Tap to open your calendar.',
        url: meeting.meeting_url || `/${space}/calendar`,
        tag: `meeting-${meeting.id}`,
      },
      {
        workspaceId: meeting.workspace_id,
        type: 'meeting_reminder',
        data: { meeting_id: meeting.id },
      },
    )
  }
  return sent
}

async function deadlineReminders(admin: Admin, now: Date) {
  const { data, error } = await admin
    .from('tasks')
    .select(
      'id,title,due_at,task_number,workspace_id,workspace:workspaces(slug,task_prefix),assignees:task_assignees(user_id)',
    )
    .eq('state', 'open')
    .gt('due_at', now.toISOString())
    .lte('due_at', new Date(now.getTime() + DEADLINE_LEAD_MS).toISOString())
  if (error) throw new Error(error.message)
  const members = await membersOf(
    admin,
    (data ?? []).map((row) => row.workspace_id),
  )
  let sent = 0
  for (const task of (data ?? []) as Row[]) {
    const workspace = one(task.workspace)
    const space = spaceOf(workspace?.slug)
    const recipients = [
      ...(members.get(task.workspace_id) ?? []),
      ...((task.assignees ?? []) as Row[]).map((item) => item.user_id as string),
    ]
    sent += await deliver(
      admin,
      recipients,
      `due:${task.id}:${task.due_at}`,
      {
        title: `Due in ${minutesUntil(task.due_at, now)} min: ${task.title}`,
        body: `${workspace?.task_prefix ?? 'Task'}-${task.task_number} · ${space[0].toUpperCase()}${space.slice(1)}`,
        url: `/${space}/tasks`,
        tag: `due-${task.id}`,
      },
      { workspaceId: task.workspace_id, type: 'task_due', data: { task_id: task.id } },
    )
  }
  return sent
}

/** Local calendar date and clock time of `date` in `timeZone` (UTC if the zone is invalid). */
function localParts(date: Date, timeZone: string) {
  let format: Intl.DateTimeFormat
  try {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    return localParts(date, 'UTC')
  }
  const parts = Object.fromEntries(
    format.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

async function morningDigests(admin: Admin, now: Date) {
  const { data: profiles, error } = await admin.from('profiles').select('id,timezone')
  if (error) throw new Error(error.message)
  const start = DIGEST_HOUR * 60 + DIGEST_MINUTE
  let sent = 0
  for (const profile of (profiles ?? []) as Row[]) {
    const timeZone = profile.timezone || 'UTC'
    const local = localParts(now, timeZone)
    if (local.minutes < start || local.minutes > start + DIGEST_GRACE_MINUTES) continue

    // Tasks in the user's workspaces or tagged to them, due on their local today.
    const [memberships, tagged] = await Promise.all([
      admin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)
        .eq('status', 'active'),
      admin.from('task_assignees').select('task_id').eq('user_id', profile.id),
    ])
    const workspaceIds = (memberships.data ?? []).map((row) => row.workspace_id)
    const taskIds = (tagged.data ?? []).map((row) => row.task_id)
    if (!workspaceIds.length && !taskIds.length) continue
    const filters = [
      workspaceIds.length ? `workspace_id.in.(${workspaceIds.join(',')})` : '',
      taskIds.length ? `id.in.(${taskIds.join(',')})` : '',
    ].filter(Boolean)
    const { data: tasks } = await admin
      .from('tasks')
      .select('id,title,due_at,workspace_id,workspace:workspaces(slug)')
      .eq('state', 'open')
      .gte('due_at', new Date(now.getTime() - 86_400_000).toISOString())
      .lte('due_at', new Date(now.getTime() + 2 * 86_400_000).toISOString())
      .or(filters.join(','))
    const today = ((tasks ?? []) as Row[]).filter(
      (task) => localParts(new Date(task.due_at), timeZone).day === local.day,
    )
    if (!today.length) continue

    // One notification on the device, one bell entry per workspace.
    const byWorkspace = new Map<string, Row[]>()
    for (const task of today) {
      byWorkspace.set(task.workspace_id, [...(byWorkspace.get(task.workspace_id) ?? []), task])
    }
    const [firstWorkspace, firstTasks] = [...byWorkspace][0]
    const titles = today.map((task) => task.title)
    const delivered = await deliver(
      admin,
      [profile.id],
      `digest:${local.day}`,
      {
        title: `Today: ${today.length} ${today.length === 1 ? 'task' : 'tasks'} due`,
        body:
          titles.slice(0, 4).join(' · ') +
          (titles.length > 4 ? ` · +${titles.length - 4} more` : ''),
        url: `/${spaceOf(one(firstTasks[0].workspace)?.slug)}`,
        tag: `digest-${local.day}`,
      },
      { workspaceId: firstWorkspace, type: 'daily_digest', data: { day: local.day } },
    )
    sent += delivered
    // Already sent today (claimed on an earlier run): don't add the bell entries again.
    if (!delivered) continue
    // Bell entries for the other workspaces (the push above already covered them).
    for (const [workspaceId, list] of [...byWorkspace].slice(1)) {
      await admin.from('notifications').insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        type: 'daily_digest',
        title: `Today: ${list.length} ${list.length === 1 ? 'task' : 'tasks'} due`,
        body: list.map((task) => task.title).join(' · '),
        data: { day: local.day },
      })
    }
  }
  return sent
}

export async function runReminders(now = new Date()) {
  const admin = createAdminClient()
  const [meetings, deadlines, digests] = await Promise.all([
    meetingReminders(admin, now),
    deadlineReminders(admin, now),
    morningDigests(admin, now),
  ])
  return { meetings, deadlines, digests }
}
