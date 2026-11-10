'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarPanel } from '@/components/calendar/calendar-panel'
import { MeetingCategories } from '@/components/calendar/meeting-categories'
import { timeOfDay } from '@/lib/format'
import { workspacePath } from '@/lib/routes'
import { useToast, useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'
import { ActivityFeed } from './activity-feed'
import { DayNote } from './day-note'
import { MailPanel } from './mail-panel'
import { PersonalHomeView } from './personal-home-view'
import { PlanPanel } from './plan-panel'
import { TaskList } from './task-list'
import { TimerCard } from './timer-card'
import { TodayOverview } from './today-overview'

const ALERT_WINDOW_MS = 60 * 60 * 1000

/** The meeting in progress or starting within the next hour, if any. */
function upcomingMeeting(meetings: Meeting[], now: number) {
  return meetings.find((meeting) => {
    const starts = new Date(meeting.startsAt).getTime()
    const ends = new Date(meeting.endsAt).getTime()
    return ends > now && starts - now <= ALERT_WINDOW_MS
  })
}

/**
 * Office and Studio's dashboard. Personal has its own, much simpler `PersonalHomeView` —
 * `HomeView` delegates to it immediately below, so this layout only ever runs for Office/Studio.
 */
export function HomeView() {
  const { workspace, meetings } = useWorkspace()
  const { showToast } = useToast()
  const router = useRouter()
  const [now, setNow] = useState<number | null>(null)
  const [hidden, setHidden] = useState<Record<string, number>>({})

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (workspace.key === 'personal') return <PersonalHomeView />

  const meeting = now ? upcomingMeeting(meetings, now) : undefined
  const visible = meeting && now && (hidden[meeting.id] ?? 0) < now
  const minutes =
    meeting && now ? Math.round((new Date(meeting.startsAt).getTime() - now) / 60000) : 0

  const banner = visible && meeting && (
    <section className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent-light px-4 py-2.5">
      <p className="mr-auto min-w-0 text-sm text-accent-ink">
        <strong className="font-medium">
          {meeting.title} {minutes > 0 ? `starts in ${minutes} min` : 'is happening now'}
        </strong>{' '}
        · {timeOfDay(meeting.startsAt)}
        {meeting.location && ` · ${meeting.location}`}
      </p>
      <button
        type="button"
        onClick={() => {
          setHidden((current) => ({ ...current, [meeting.id]: Date.now() + 10 * 60 * 1000 }))
          showToast('Reminder snoozed for 10 minutes.')
        }}
        className="h-8 rounded-lg border border-line-strong bg-surface px-3 text-ui text-ink-2"
      >
        Snooze 10 min
      </button>
      <button
        type="button"
        onClick={() => setHidden((current) => ({ ...current, [meeting.id]: Infinity }))}
        className="h-8 rounded-lg border border-line-strong bg-surface px-3 text-ui text-ink-2"
      >
        Dismiss
      </button>
      <button
        type="button"
        onClick={() =>
          meeting.meetingUrl
            ? window.open(meeting.meetingUrl, '_blank', 'noopener')
            : router.push(workspacePath(workspace.key, 'calendar'))
        }
        className="h-8 rounded-lg bg-primary px-4 text-ui font-medium text-on-primary hover:bg-primary-hover active:bg-primary-active"
      >
        {meeting.meetingUrl ? 'Join' : 'Open calendar'}
      </button>
    </section>
  )

  /*
   * Office and Studio: the calendar and the meetings-by-person window hold the top-right quarter of
   * the screen, and tasks share their row with mail. Placement is explicit so that below
   * xl the calendar follows the tasks.
   */
  return (
    <div className="mt-4 grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,25vw)] xl:grid-rows-[auto_1fr]">
      <div className="grid min-w-0 gap-4 xl:col-start-1 xl:row-start-1">
        {banner}
        <TodayOverview />
        {/* Tasks and mail share the row, half each (stacked on phones). */}
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <TaskList narrow />
          <MailPanel workspace={workspace} />
        </div>
      </div>
      <aside
        className="grid min-w-0 gap-4 md:grid-cols-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:grid-cols-1"
        aria-label="Calendar and meetings"
      >
        <CalendarPanel defaultRange="Month" side />
        <MeetingCategories />
      </aside>
      <div className="grid min-w-0 items-start gap-4 md:grid-cols-2 xl:col-start-1 xl:row-start-2">
        <TimerCard />
        <PlanPanel />
        <DayNote />
        <ActivityFeed />
      </div>
    </div>
  )
}
