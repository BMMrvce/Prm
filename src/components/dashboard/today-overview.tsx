'use client'

import { AlertCircle, CalendarCheck, CheckCircle2, Clock3, type LucideIcon } from 'lucide-react'
import { useTaskTime, useNow } from '@/components/tasks/use-task-time'
import { duration, entrySeconds, localDate } from '@/lib/format'
import { dueBucket, isToday } from '@/lib/tasks'
import { useWorkspace } from '@/state/workbench-store'

/** Four at-a-glance numbers for today: due, overdue, completed and time you tracked. */
export function TodayOverview() {
  const { ready, tasks, timeEntries, profile, meetings } = useWorkspace()
  const { now: tick } = useTaskTime()
  const now = useNow(30_000)

  const open = tasks.filter((task) => task.state === 'open')
  const dueToday = now ? open.filter((task) => dueBucket(task, now) === 'today').length : 0
  const overdue = now ? open.filter((task) => dueBucket(task, now) === 'overdue').length : 0
  const done = now
    ? tasks.filter((task) => task.state === 'completed' && isToday(task.completedAt, now)).length
    : 0
  const today = now ? localDate(now) : ''
  const trackedMinutes =
    timeEntries
      .filter(
        (entry) => entry.userId === profile?.id && localDate(new Date(entry.startedAt)) === today,
      )
      .reduce((sum, entry) => sum + entrySeconds(entry, tick), 0) / 60
  const meetingsToday = now
    ? meetings.filter((meeting) => isToday(meeting.startsAt, now)).length
    : 0
  const loading = !ready || !now

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today at a glance">
      <Stat
        icon={CalendarCheck}
        label="Due today"
        value={dueToday}
        hint={
          meetingsToday
            ? `${meetingsToday} meeting${meetingsToday === 1 ? '' : 's'} too`
            : 'No meetings'
        }
        tone="accent"
        loading={loading}
      />
      <Stat
        icon={AlertCircle}
        label="Overdue"
        value={overdue}
        hint={overdue ? 'Needs attention' : 'Nothing slipping'}
        tone={overdue ? 'error' : 'muted'}
        loading={loading}
      />
      <Stat
        icon={CheckCircle2}
        label="Done today"
        value={done}
        hint={`${open.length} still open`}
        tone="success"
        loading={loading}
      />
      <Stat
        icon={Clock3}
        label="Tracked today"
        value={duration(trackedMinutes)}
        hint="Your time, all tasks"
        tone="primary"
        loading={loading}
      />
    </section>
  )
}

const TONES = {
  accent: 'bg-accent-light text-accent-ink',
  error: 'bg-error-light text-error-ink',
  success: 'bg-success-light text-success-ink',
  primary: 'bg-primary-light text-primary-ink',
  muted: 'bg-surface-2 text-ink-2',
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  loading,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  hint: string
  tone: keyof typeof TONES
  loading: boolean
}) {
  return (
    <div className="neo-card flex min-w-0 items-center gap-3 rounded-xl px-4 py-3.5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-2">{label}</p>
        {loading ? (
          <span className="skeleton mt-1 block h-6 w-10 rounded" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums leading-7 text-ink">{value}</p>
        )}
        <p className="truncate text-2xs text-ink-3">{hint}</p>
      </div>
    </div>
  )
}
