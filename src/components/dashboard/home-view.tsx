'use client'

import { useState } from 'react'
import { CalendarPanel } from '@/components/calendar/calendar-panel'
import { useWorkspace } from '@/state/workbench-store'
import { ActivityFeed } from './activity-feed'
import { DayNote } from './day-note'
import { MailPanel } from './mail-panel'
import { PlanPanel } from './plan-panel'
import { TaskList } from './task-list'

export function HomeView() {
  const { workspace } = useWorkspace()
  const [dismissed, setDismissed] = useState(false)

  return (
    <>
      {!dismissed && (
        <section className="mt-[15px] flex flex-wrap items-center gap-2 rounded-lg border border-[#f1d969] bg-[#fff8cf] px-4 py-[7px]">
          <p className="mr-auto text-[14px] text-[#684a00]">
            <strong className="font-medium">{workspace.alert}</strong> · {workspace.alertMeta}
          </p>
          <button
            type="button"
            className="h-8 rounded-lg border border-[#d9d9dc] bg-white px-3 text-[13px] text-[#45454a]"
          >
            Snooze 10 min
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-8 rounded-lg border border-[#d9d9dc] bg-white px-3 text-[13px] text-[#45454a]"
          >
            Dismiss
          </button>
          <button
            type="button"
            className="h-8 rounded-lg bg-[#493bd0] px-4 text-[13px] font-medium text-white"
          >
            Join
          </button>
        </section>
      )}

      <div className="mt-[13px] grid gap-4 xl:grid-cols-[333px_minmax(0,1fr)]">
        <TaskList />
        <CalendarPanel />
      </div>

      <div className="mt-[15px] grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DayNote workspace={workspace} />
        <MailPanel workspace={workspace} />
        <PlanPanel />
        <ActivityFeed workspace={workspace} />
      </div>
    </>
  )
}
