'use client'

import { CheckCheck, ListChecks, Search, X } from 'lucide-react'
import { useState } from 'react'
import { groupByDue } from '@/lib/tasks'
import { useWorkspace } from '@/state/workbench-store'
import { TaskComposer } from './task-composer'
import { TaskDialog } from './task-dialog'
import { TaskRow, TaskRowSkeleton } from './task-row'
import { useNow, useTaskTime } from './use-task-time'

/**
 * The full task list: a composer with every option, open tasks grouped by due date
 * (Overdue, Today, Next 7 days, Later, No due date) or completed tasks newest first, and a
 * filter. Pass `projectId` to scope it to one project.
 */
export function TaskBoard({ projectId }: { projectId?: string }) {
  const { ready, tasks: allTasks } = useWorkspace()
  const { secondsFor } = useTaskTime()
  const now = useNow()
  const [filter, setFilter] = useState<'open' | 'completed'>('open')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const scoped = projectId ? allTasks.filter((task) => task.projectId === projectId) : allTasks
  const openCount = scoped.filter((task) => task.state === 'open').length
  const doneCount = scoped.filter((task) => task.state === 'completed').length
  const term = query.trim().toLowerCase()
  const tasks = scoped.filter(
    (task) =>
      task.state === filter &&
      (!term ||
        task.title.toLowerCase().includes(term) ||
        task.code.toLowerCase().includes(term) ||
        (task.projectName ?? '').toLowerCase().includes(term)),
  )
  const groups =
    filter === 'open'
      ? now
        ? groupByDue(tasks, now)
        : []
      : [
          {
            key: 'done',
            label: 'Completed',
            tone: 'bg-success',
            tasks: [...tasks].sort((a, b) =>
              (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
            ),
          },
        ]

  return (
    <section className="min-w-0 space-y-4">
      <TaskComposer projectId={projectId} variant="full" />

      <div className="neo-card min-w-0 overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div
            className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-medium"
            role="tablist"
            aria-label="Task state"
          >
            {(
              [
                ['open', 'Open', ListChecks, openCount],
                ['completed', 'Completed', CheckCheck, doneCount],
              ] as const
            ).map(([value, label, Icon, count]) => (
              <button
                type="button"
                role="tab"
                aria-selected={filter === value}
                key={value}
                onClick={() => setFilter(value)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${filter === value ? 'bg-segment text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
              >
                <Icon size={14} />
                {label}
                <span className="tabular-nums text-ink-3">{count}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-line-strong bg-field pl-8 pr-8 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Filter tasks"
              aria-label="Filter tasks"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:text-ink"
                aria-label="Clear filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="p-2 sm:p-3">
          {(!ready || !now) && <TaskRowSkeleton rows={5} />}
          {ready && now && !tasks.length && (
            <p className="px-3 py-10 text-center text-sm text-ink-3">
              {term
                ? 'No tasks match that filter.'
                : filter === 'open'
                  ? 'No open tasks. Add one above.'
                  : 'No completed tasks yet.'}
            </p>
          )}
          {groups
            .filter((group) => group.tasks.length)
            .map((group) => (
              <div key={group.key} className="mt-3 first:mt-0">
                <h3 className="flex items-center gap-2 px-2.5 pb-1 pt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">
                  <span className={`size-1.5 rounded-full ${group.tone}`} aria-hidden />
                  {group.label}
                  <span className="font-medium tabular-nums text-ink-3">{group.tasks.length}</span>
                </h3>
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    seconds={secondsFor(task.id)}
                    now={now}
                    onOpen={setEditing}
                    showProject={!projectId}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
      {editing && <TaskDialog taskId={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
