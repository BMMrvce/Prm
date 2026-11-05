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
        <p className="mt-4 text-[13px] text-[#88888e]">Activity will show up as you work.</p>
      )}
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <div className="flex gap-2 text-[13px] leading-5" key={`${event.at}-${event.text}`}>
            <p className="min-w-0 flex-1 break-words text-[#55555c]">{event.text}</p>
            <span className="shrink-0 text-[11px] text-[#99999f]">{mailDate(event.at)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
