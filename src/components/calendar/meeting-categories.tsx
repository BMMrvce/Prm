'use client'

import { ExternalLink, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useNow } from '@/components/tasks/use-task-time'
import { PanelHeader } from '@/components/ui/panel'
import { timeOfDay, weekRange } from '@/lib/format'
import { meetingCategory } from '@/lib/meetings'
import { workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'
import { MeetingDialog } from './meeting-dialog'
import { useMeetingCategories } from './use-meeting-categories'

/** Weeks ahead (including this one) whose meetings are loaded for the lists. */
const WEEKS_AHEAD = 4

/**
 * Office and Studio: meetings grouped by who they are with (Guru, Arjun, Client). Pick a category to
 * list its upcoming meetings for the next four weeks; click one to edit it.
 */
export function MeetingCategories() {
  const { workspace, ready, meetings, loadWeek } = useWorkspace()
  const categories = useMeetingCategories() ?? []
  const now = useNow()
  const [selected, setSelected] = useState('')
  const [editing, setEditing] = useState<Meeting | null>(null)

  // Meetings load a week at a time; fetch this week and the next few once.
  const loadWeekRef = useRef(loadWeek)
  useEffect(() => {
    loadWeekRef.current = loadWeek
  })
  useEffect(() => {
    if (!ready) return
    const start = weekRange()[0]
    for (let week = 0; week < WEEKS_AHEAD; week++) {
      const day = new Date(start)
      day.setDate(start.getDate() + week * 7)
      void loadWeekRef.current(day)
    }
  }, [ready])

  const horizon = now ? weekRange(now)[0].getTime() + WEEKS_AHEAD * 7 * 86_400_000 : 0
  const upcoming = now
    ? meetings
        .filter((meeting) => {
          const ends = new Date(meeting.endsAt).getTime()
          return ends >= now.getTime() && new Date(meeting.startsAt).getTime() < horizon
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : []
  const byCategory = (id: string) =>
    upcoming.filter((meeting) => meetingCategory(meeting, categories)?.id === id)
  // Falls back to the first category when none is picked or the picked one was removed.
  const active = categories.find((item) => item.id === selected) ?? categories[0]
  const list = active ? byCategory(active.id) : []
  const settingsHref = `${workspacePath(workspace.key, 'settings')}#meeting-colors`

  return (
    <section className="neo-card min-w-0 rounded-xl p-4 sm:p-5">
      <PanelHeader icon={Users} title="Meetings" subtitle="Next 4 weeks, by who it's with">
        <Link
          href={settingsHref}
          className="shrink-0 text-2xs font-semibold text-primary-ink hover:underline"
        >
          Manage
        </Link>
      </PanelHeader>

      {!categories.length && (
        <p className="mt-4 rounded-lg border border-dashed border-line-strong px-3 py-5 text-center text-xs text-ink-2">
          No meeting categories yet.{' '}
          <Link href={settingsHref} className="font-semibold text-primary-ink hover:underline">
            Add people in Settings
          </Link>
        </p>
      )}

      {active && (
        <>
          <div
            className="mt-4 grid grid-cols-3 gap-1.5"
            role="tablist"
            aria-label="Meeting category"
          >
            {categories.map((item) => {
              const count = byCategory(item.id).length
              const on = item.id === active?.id
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  key={item.id}
                  title={`${item.label}: ${byCategory(item.id).length} upcoming`}
                  onClick={() => setSelected(item.id)}
                  className={`flex min-w-0 flex-col items-start rounded-lg border px-2.5 py-2 text-left ${
                    on
                      ? item.tab
                      : 'border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <span className="flex w-full min-w-0 items-center gap-1.5 text-xs font-semibold">
                    <span className={`size-2 shrink-0 rounded-full ${item.dot}`} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="mt-0.5 text-lg font-semibold tabular-nums leading-6">
                    {now ? count : '–'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3" role="tabpanel" aria-label={`Meetings with ${active.label}`}>
            {!now || !ready ? (
              <div className="space-y-2" aria-hidden>
                {[0, 1].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-lg bg-surface-2" />
                ))}
              </div>
            ) : list.length ? (
              <ul className="space-y-1.5">
                {list.map((meeting) => {
                  const starts = new Date(meeting.startsAt)
                  return (
                    <li key={meeting.id}>
                      <div
                        className={`flex items-stretch gap-2.5 rounded-lg border-l-[3px] bg-surface-2 py-2 pl-2.5 pr-2 ${active.border}`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditing(meeting)}
                          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                          aria-label={`Edit ${meeting.title}`}
                        >
                          <span className="w-9 shrink-0 text-center">
                            <span className="block text-2xs font-semibold uppercase text-ink-3">
                              {starts.toLocaleDateString([], { month: 'short' })}
                            </span>
                            <span className="block text-base font-semibold tabular-nums leading-5 text-ink">
                              {starts.getDate()}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-ui font-medium text-ink">
                              {meeting.title}
                            </span>
                            <span className="block text-2xs tabular-nums text-ink-2">
                              {starts.toLocaleDateString([], { weekday: 'short' })} ·{' '}
                              {timeOfDay(meeting.startsAt)}–{timeOfDay(meeting.endsAt)}
                            </span>
                            {meeting.location && (
                              <span className="mt-0.5 flex items-center gap-1 truncate text-2xs text-ink-3">
                                <MapPin size={11} aria-hidden /> {meeting.location}
                              </span>
                            )}
                          </span>
                        </button>
                        {meeting.meetingUrl && (
                          <a
                            href={meeting.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid size-7 shrink-0 place-items-center self-center rounded-md text-ink-2 hover:bg-surface-3 hover:text-ink"
                            aria-label={`Join ${meeting.title}`}
                            title="Join"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-center text-xs text-ink-2">
                No upcoming meetings with {active.label}.
                <span className="mt-1 block text-ink-3">
                  Add one from the calendar and pick “With {active.label}”.
                </span>
              </p>
            )}
          </div>
        </>
      )}
      {editing && <MeetingDialog meeting={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
