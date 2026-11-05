'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarPanel } from '@/components/calendar/calendar-panel'
import { WatchLaterPanel } from '@/components/youtube/watch-later-panel'
import { timeOfDay } from '@/lib/format'
import { workspacePath } from '@/lib/routes'
import { useToast, useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'
import { ActivityFeed } from './activity-feed'
import { DayNote } from './day-note'
import { MailPanel } from './mail-panel'
import { PlanPanel } from './plan-panel'
import { TaskList } from './task-list'

const ALERT_WINDOW_MS = 60 * 60 * 1000

/** The meeting in progress or starting within the next hour, if any. */
function upcomingMeeting(meetings: Meeting[], now: number) {
  return meetings.find((meeting) => {
    const starts = new Date(meeting.startsAt).getTime()
    const ends = new Date(meeting.endsAt).getTime()
    return ends > now && starts - now <= ALERT_WINDOW_MS
  })
}

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

  const meeting = now ? upcomingMeeting(meetings, now) : undefined
  const visible = meeting && now && (hidden[meeting.id] ?? 0) < now
  const minutes =
    meeting && now ? Math.round((new Date(meeting.startsAt).getTime() - now) / 60000) : 0

  return (
    <>
      {visible && meeting && (
        <section className="mt-[15px] flex flex-wrap items-center gap-2 rounded-lg border border-[#f1d969] bg-[#fff8cf] px-4 py-[7px]">
          <p className="mr-auto min-w-0 text-[14px] text-[#684a00]">
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
            className="h-8 rounded-lg border border-[#d9d9dc] bg-white px-3 text-[13px] text-[#45454a]"
          >
            Snooze 10 min
          </button>
          <button
            type="button"
            onClick={() => setHidden((current) => ({ ...current, [meeting.id]: Infinity }))}
            className="h-8 rounded-lg border border-[#d9d9dc] bg-white px-3 text-[13px] text-[#45454a]"
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
            className="h-8 rounded-lg bg-[#493bd0] px-4 text-[13px] font-medium text-white"
          >
            {meeting.meetingUrl ? 'Join' : 'Open calendar'}
          </button>
        </section>
      )}

      <div className="mt-[13px] grid min-w-0 gap-4 xl:grid-cols-[333px_minmax(0,1fr)]">
        <TaskList />
        <CalendarPanel />
      </div>

      <div className="mt-[15px] grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DayNote />
        <MailPanel workspace={workspace} />
        <PlanPanel />
        <ActivityFeed />
      </div>

      {workspace.key === 'personal' && <WatchLaterPanel />}
    </>
  )
}
