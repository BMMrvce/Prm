'use client'

import { mailDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

/** Recent changes in this workspace, derived from task and meeting timestamps. */
export function ActivityFeed() {
  const { ready, tasks, meetings } = useWorkspace()
  const events = [
    ...tasks.map((task) => ({ at: task.createdAt, text: `Created “${task.title}”` })),
    ...tasks
      .filter((task) => task.completedAt)
      .map((task) => ({ at: task.completedAt!, text: `Completed “${task.title}”` })),
    // Meetings of other weeks may be loaded by the calendar; only past ones are activity.
    ...meetings
      .filter((meeting) => new Date(meeting.startsAt).getTime() <= Date.now())
      .map((meeting) => ({ at: meeting.startsAt, text: `Meeting: ${meeting.title}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)

  return (
    <section className="neo-card min-h-[330px] min-w-0 rounded-xl p-4">
      <h2 className="text-[15px] font-semibold">What’s Cooking</h2>
      {ready && !events.length && (
        <p className="mt-4 text-[13px] text-ink-3">Activity will show up as you work.</p>
      )}
      <ol className="relative mt-4 space-y-4 before:absolute before:inset-y-1 before:left-[3px] before:w-px before:bg-line">
        {events.map((event) => (
          <li
            className="relative flex gap-3 pl-4 text-[13px] leading-5"
            key={`${event.at}-${event.text}`}
          >
            <span
              className="absolute left-0 top-[7px] size-[7px] rounded-full bg-accent ring-2 ring-surface"
              aria-hidden
            />
            <p className="min-w-0 flex-1 break-words text-ink">{event.text}</p>
            <time className="shrink-0 text-[11px] tabular-nums text-ink-3">
              {mailDate(event.at)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  )
}
