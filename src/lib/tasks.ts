import { localDate } from '@/lib/format'
import type { Priority, WorkspaceTask } from '@/types/workbench'

/** Where an open task sits relative to today, by its due date. */
export type DueBucket = 'overdue' | 'today' | 'upcoming' | 'later' | 'anytime'

export const BUCKETS: { key: DueBucket; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', tone: 'bg-error' },
  { key: 'today', label: 'Today', tone: 'bg-accent' },
  { key: 'upcoming', label: 'Next 7 days', tone: 'bg-primary' },
  { key: 'later', label: 'Later', tone: 'bg-ink-3' },
  { key: 'anytime', label: 'No due date', tone: 'bg-line-strong' },
]

/** Whole days from today to the task's local due day (negative when past). */
function daysUntil(dueAt: string, now: Date) {
  const day = (date: Date) => new Date(`${localDate(date)}T12:00`).getTime()
  return Math.round((day(new Date(dueAt)) - day(now)) / 86_400_000)
}

export function dueBucket(task: Pick<WorkspaceTask, 'dueAt'>, now: Date): DueBucket {
  if (!task.dueAt) return 'anytime'
  const days = daysUntil(task.dueAt, now)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  return days <= 7 ? 'upcoming' : 'later'
}

/** "Today", "Tomorrow", "Yesterday", "Mon 9 Nov"; with a tone for the due chip. */
export function dueLabel(
  dueAt: string,
  now: Date,
): { text: string; tone: 'error' | 'accent' | 'muted' } {
  const days = daysUntil(dueAt, now)
  const date = new Date(dueAt)
  const short = date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  if (days === 0) return { text: 'Today', tone: 'accent' }
  if (days === 1) return { text: 'Tomorrow', tone: 'muted' }
  if (days === -1) return { text: 'Yesterday', tone: 'error' }
  return { text: short, tone: days < 0 ? 'error' : 'muted' }
}

/** Groups tasks by due bucket, each sorted by due date then priority. Empty groups dropped. */
export function groupByDue(tasks: WorkspaceTask[], now: Date, only?: DueBucket[]) {
  const rank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
  const sorted = [...tasks].sort(
    (a, b) =>
      (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999') ||
      rank[a.priority] - rank[b.priority] ||
      b.createdAt.localeCompare(a.createdAt),
  )
  return BUCKETS.filter((bucket) => !only || only.includes(bucket.key))
    .map((bucket) => ({
      ...bucket,
      tasks: sorted.filter((task) => dueBucket(task, now) === bucket.key),
    }))
    .filter((group) => group.tasks.length)
}

/** Priority styling: check ring, flag color, and label. `none` has no flag. */
export const PRIORITY: Record<Priority, { label: string; ring: string; flag: string }> = {
  urgent: { label: 'Urgent', ring: 'border-error hover:bg-error-light', flag: 'text-error-ink' },
  high: { label: 'High', ring: 'border-warning hover:bg-warning-light', flag: 'text-warning-ink' },
  medium: { label: 'Medium', ring: 'border-info hover:bg-info-light', flag: 'text-info-ink' },
  low: { label: 'Low', ring: 'border-ink-3 hover:bg-surface-2', flag: 'text-ink-3' },
  none: { label: 'No priority', ring: 'border-line-strong hover:bg-surface-2', flag: 'text-ink-3' },
}

export const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high', 'urgent']

/** Local `YYYY-MM-DD` for today plus `days`. */
export function dayFromToday(days: number, now = new Date()) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return localDate(date)
}

/** A `YYYY-MM-DD` due day stored as the end of that day, local time (as tasks always were). */
export function dueAtFromDay(day: string) {
  return day ? new Date(`${day}T23:59`).toISOString() : null
}

/** True when the ISO timestamp falls on the same local day as `now`. */
export function isToday(iso: string | null, now: Date) {
  return Boolean(iso) && localDate(new Date(iso!)) === localDate(now)
}
