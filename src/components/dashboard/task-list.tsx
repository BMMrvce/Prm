'use client'

import { ChevronDown, ListChecks, PartyPopper } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { MeetingDialog } from '@/components/calendar/meeting-dialog'
import { useMeetingsAhead } from '@/components/calendar/use-meetings-ahead'
import { MeetingRow } from '@/components/tasks/meeting-row'
import { TaskComposer } from '@/components/tasks/task-composer'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { TaskRow, TaskRowSkeleton } from '@/components/tasks/task-row'
import { useNow, useTaskTime } from '@/components/tasks/use-task-time'
import { PanelHeader } from '@/components/ui/panel'
import { workspacePath } from '@/lib/routes'
import { dayFromToday, groupByDue, isToday, type DueBucket } from '@/lib/tasks'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting, WorkspaceTask } from '@/types/workbench'

type View = 'today' | 'upcoming' | 'all'

const VIEWS: { key: View; label: string; buckets: DueBucket[] | undefined }[] = [
  { key: 'today', label: 'Today', buckets: ['overdue', 'today'] },
  { key: 'upcoming', label: 'Upcoming', buckets: ['upcoming', 'later'] },
  { key: 'all', label: 'All open', buckets: undefined },
]

/** Rows (meetings and tasks) shown on the dashboard before "View all" links to My Tasks. */
const VISIBLE_TASKS = 8

/**
 * The dashboard's centerpiece: open tasks grouped by when they are due (Today, Upcoming,
 * All), with that day's meetings listed first in each group, a quick-add line, and today's
 * completed tasks tucked underneath.
 */
export function TaskList({
  narrow = false,
  bare = false,
  fixedView,
  limit,
}: {
  /** Half-width layout: the view tabs always get their own row under the title. */
  narrow?: boolean
  /** Skips the outer card and header, for composing inside another card (e.g. Home). */
  bare?: boolean
  /** Locks the view and hides the Today/Upcoming/All tabs. */
  fixedView?: View
  /** Caps how many open rows are shown before "View all" takes over. Defaults to 8. */
  limit?: number
} = {}) {
  const { workspace, ready, tasks, meetings } = useWorkspace()
  useMeetingsAhead()
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const { secondsFor } = useTaskTime()
  const now = useNow()
  const [view, setView] = useState<View>(fixedView ?? 'today')
  const [editing, setEditing] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const maxVisible = limit ?? VISIBLE_TASKS

  const open = tasks.filter((task) => task.state === 'open')
  const doneToday = now
    ? tasks.filter((task) => task.state === 'completed' && isToday(task.completedAt, now))
    : []
  const active = VIEWS.find((item) => item.key === view)!
  const groups = now ? groupByDue(open, now, active.buckets, meetings) : []
  const total = groups.reduce((sum, group) => sum + group.tasks.length + group.meetings.length, 0)
  const meetingsToday = groups.find((group) => group.key === 'today')?.meetings.length ?? 0

  // Cap the dashboard list, trimming whole rows from the last groups first. Meetings lead.
  type Row = { kind: 'meeting'; meeting: Meeting } | { kind: 'task'; task: WorkspaceTask }
  let budget = maxVisible
  const shown = groups
    .map((group) => {
      const all: Row[] = [
        ...group.meetings.map((meeting) => ({ kind: 'meeting' as const, meeting })),
        ...group.tasks.map((task) => ({ kind: 'task' as const, task })),
      ]
      const rows = all.slice(0, Math.max(0, budget))
      budget -= rows.length
      return { ...group, count: all.length, rows }
    })
    .filter((group) => group.rows.length)

  return (
    <section className={bare ? 'flex min-w-0 flex-col' : 'neo-card flex min-w-0 flex-col rounded-xl p-4 sm:p-5'}>
      {!bare && (
        <PanelHeader
          icon={ListChecks}
          title="My Tasks"
          subtitle={
            ready
              ? `${open.length} open · ${doneToday.length} done today${
                  meetingsToday
                    ? ` · ${meetingsToday} meeting${meetingsToday === 1 ? '' : 's'} today`
                    : ''
                }`
              : 'Loading your tasks…'
          }
        >
          {!fixedView && (
            <div
              className={`hidden rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-medium ${narrow ? '' : 'sm:flex'}`}
              role="tablist"
              aria-label="Task view"
            >
              {VIEWS.map((item) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === item.key}
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`rounded-md px-3 py-1.5 ${view === item.key ? 'bg-segment text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </PanelHeader>
      )}

      {/* Phones: the view tabs get their own full-width row. */}
      {!fixedView && (
        <div
          className={`mt-3 grid grid-cols-3 rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-medium ${narrow ? '' : 'sm:hidden'}`}
          role="tablist"
          aria-label="Task view"
        >
          {VIEWS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={view === item.key}
              key={item.key}
              onClick={() => setView(item.key)}
              className={`rounded-md py-1.5 ${view === item.key ? 'bg-segment text-ink shadow-sm' : 'text-ink-2'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <TaskComposer defaultDue={view === 'today' && now ? dayFromToday(0, now) : ''} />
      </div>

      <div className={`mt-3 flex-1 ${bare ? '' : 'min-h-[220px]'}`}>
        {(!ready || !now) && <TaskRowSkeleton rows={bare ? 3 : 4} />}
        {ready && now && !total && bare && (
          <p className="py-6 text-center text-sm text-ink-3">Nothing due today — add one above.</p>
        )}
        {ready && now && !total && !bare && (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-accent-light text-accent-ink">
              <PartyPopper size={20} />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">
              {view === 'today'
                ? 'Nothing due or scheduled today'
                : view === 'upcoming'
                  ? 'No tasks or meetings ahead'
                  : open.length
                    ? 'All caught up'
                    : 'No open tasks'}
            </p>
            <p className="mt-0.5 text-xs text-ink-2">
              {view !== 'all' && open.length
                ? `${open.length} open ${open.length === 1 ? 'task has' : 'tasks have'} other dates.`
                : 'Add a task above to get started.'}
            </p>
            {view !== 'all' && open.length > 0 && (
              <button
                type="button"
                onClick={() => setView('all')}
                className="mt-3 text-xs font-semibold text-primary-ink hover:underline"
              >
                Show all open tasks
              </button>
            )}
          </div>
        )}
        {shown.map((group) => (
          <div key={group.key} className="mt-2 first:mt-0">
            <h3 className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">
              <span className={`size-1.5 rounded-full ${group.tone}`} aria-hidden />
              {group.label}
              <span className="font-medium tabular-nums text-ink-3">{group.count}</span>
            </h3>
            <div>
              {group.rows.map((row) =>
                row.kind === 'meeting' ? (
                  <MeetingRow
                    key={`meeting-${row.meeting.id}`}
                    meeting={row.meeting}
                    now={now!}
                    onOpen={setEditingMeeting}
                    compact={narrow}
                  />
                ) : (
                  <TaskRow
                    key={row.task.id}
                    task={row.task}
                    seconds={secondsFor(row.task.id)}
                    now={now}
                    onOpen={setEditing}
                    compact={narrow}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      {bare ? (
        <>
          {doneToday.length > 0 && (
            <div className="mt-1 border-t border-line-soft pt-1">
              {doneToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  seconds={secondsFor(task.id)}
                  now={now}
                  onOpen={setEditing}
                  compact
                />
              ))}
            </div>
          )}
          <Link
            href={workspacePath(workspace.key, 'tasks')}
            className="mt-2 block text-xs font-semibold text-primary-ink hover:underline"
          >
            Open My Tasks →
          </Link>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
            {doneToday.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowDone((value) => !value)}
                aria-expanded={showDone}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showDone ? 'rotate-0' : '-rotate-90'}`}
                />
                Completed today · {doneToday.length}
              </button>
            ) : (
              <span className="text-xs text-ink-3">Nothing completed yet today</span>
            )}
            <Link
              href={workspacePath(workspace.key, 'tasks')}
              className="text-xs font-semibold text-primary-ink hover:underline"
            >
              {total > maxVisible ? `View all ${total}` : 'Open My Tasks'} →
            </Link>
          </div>
          {showDone && (
            <div className="animate-reveal mt-1">
              {doneToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  seconds={secondsFor(task.id)}
                  now={now}
                  onOpen={setEditing}
                  compact={narrow}
                />
              ))}
            </div>
          )}
        </>
      )}
      {editing && <TaskDialog taskId={editing} onClose={() => setEditing(null)} />}
      {editingMeeting && (
        <MeetingDialog meeting={editingMeeting} onClose={() => setEditingMeeting(null)} />
      )}
    </section>
  )
}
