'use client'

import { CalendarDays, Check, Clock, Flag, Pause, PencilLine, Play, Sun, Users } from 'lucide-react'
import { duration, stopwatch } from '@/lib/format'
import { dueAtFromDay, dueLabel, dayFromToday, PRIORITY } from '@/lib/tasks'
import { useWorkspace } from '@/state/workbench-store'
import type { WorkspaceTask } from '@/types/workbench'

/** Round completion control; its ring takes the task's priority color. */
export function TaskCheck({
  task,
  onToggle,
}: {
  task: Pick<WorkspaceTask, 'state' | 'priority' | 'title'>
  onToggle: () => void
}) {
  const done = task.state === 'completed'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
      className={`group/check grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] ${
        done ? 'border-primary bg-primary text-on-primary' : PRIORITY[task.priority].ring
      }`}
    >
      {done ? (
        <Check size={12} strokeWidth={3} className="animate-check" />
      ) : (
        <Check
          size={11}
          strokeWidth={3}
          className="text-ink-3 opacity-0 group-hover/check:opacity-100"
          aria-hidden
        />
      )}
    </button>
  )
}

const chip = 'inline-flex min-w-0 items-center gap-1 whitespace-nowrap'

/**
 * One task: completion control, title, and a meta line (project, due date, time, people),
 * with quick actions (timer, move to today, edit) on hover or keyboard focus. The title
 * opens the full editor.
 */
export function TaskRow({
  task,
  seconds,
  now,
  onOpen,
  showProject = true,
  compact = false,
}: {
  task: WorkspaceTask
  /** Seconds logged on the task, live while its timer runs. */
  seconds: number
  now: Date | null
  onOpen: (id: string) => void
  showProject?: boolean
  /** Half-width panels: icon-only priority, the timer as the only quick action, no code. */
  compact?: boolean
}) {
  const { projects, timer, toggleTask, updateTask, startTimer, pauseTimer, resumeTimer } =
    useWorkspace()
  const done = task.state === 'completed'
  const tracking = timer?.taskId === task.id
  const paused = tracking && timer?.state === 'paused'
  const project = projects.find((item) => item.id === task.projectId)
  const due = task.dueAt && now ? dueLabel(task.dueAt, now) : null
  const minutes = seconds / 60
  const over = Boolean(task.estimateMinutes && minutes > task.estimateMinutes)
  const priority = PRIORITY[task.priority]
  const action =
    'grid size-7 place-items-center rounded-md text-ink-2 hover:bg-surface-3 hover:text-ink'

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-surface-2 focus-within:bg-surface-2 ${
        tracking ? 'bg-accent-light/60' : ''
      }`}
    >
      {tracking && (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden />
      )}
      <span className="pt-px">
        <TaskCheck task={task} onToggle={() => void toggleTask(task.id)} />
      </span>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="min-w-0 flex-1 text-left"
        title={compact ? `${task.code} · ${task.title}` : undefined}
      >
        <span
          className={`block break-words text-sm font-medium leading-5 ${
            done ? 'text-ink-3 line-through decoration-ink-3' : 'text-ink'
          }`}
        >
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
          {showProject && task.projectName && (
            <span className={chip}>
              <span
                className="size-2 shrink-0 rounded-[3px]"
                style={{ background: project?.color }}
                aria-hidden
              />
              <span className="truncate">{task.projectName}</span>
            </span>
          )}
          {due && !done && (
            <span
              className={`${chip} ${
                due.tone === 'error'
                  ? 'font-medium text-error-ink'
                  : due.tone === 'accent'
                    ? 'font-medium text-accent-ink'
                    : ''
              }`}
            >
              <CalendarDays size={12} aria-hidden />
              {due.tone === 'error' ? `Overdue · ${due.text}` : due.text}
            </span>
          )}
          {(seconds > 0 || task.estimateMinutes || tracking) && (
            <span
              className={`${chip} tabular-nums ${
                over ? 'font-medium text-error-ink' : tracking ? 'font-medium text-accent-ink' : ''
              }`}
            >
              <Clock size={12} aria-hidden />
              {!tracking && seconds < 60 && task.estimateMinutes
                ? `est. ${duration(task.estimateMinutes)}`
                : `${tracking ? stopwatch(seconds) : duration(minutes)}${
                    task.estimateMinutes ? ` / ${duration(task.estimateMinutes)}` : ''
                  }`}
              {tracking && (paused ? ' · paused' : ' · tracking')}
            </span>
          )}
          {task.assignees.length > 0 && (
            <span className={chip} title={`${task.assignees.length} tagged`}>
              <Users size={12} aria-hidden /> {task.assignees.length}
            </span>
          )}
          {task.sharedBy && <span className="truncate text-ink-3">from {task.sharedBy}</span>}
          {!compact && <span className="text-ink-3">{task.code}</span>}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {task.priority !== 'none' && !done && (
          <span
            className={`mr-1 inline-flex items-center gap-1 text-2xs font-medium ${priority.flag}`}
            title={`${priority.label} priority`}
          >
            <Flag size={12} className="fill-current" aria-hidden />
            <span className={compact ? 'sr-only' : 'hidden sm:inline'}>{priority.label}</span>
          </span>
        )}
        {!done && (
          <span
            className={`flex items-center gap-0.5 ${
              tracking
                ? ''
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'
            }`}
          >
            {now && due?.text !== 'Today' && (
              <button
                type="button"
                onClick={() =>
                  void updateTask(task.id, { dueAt: dueAtFromDay(dayFromToday(0, now)) })
                }
                className={`${action} ${compact ? 'hidden' : 'hidden sm:grid'}`}
                aria-label={`Move ${task.title} to today`}
                title="Do today"
              >
                <Sun size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                void (!tracking ? startTimer(task.id) : paused ? resumeTimer() : pauseTimer())
              }
              className={`${action} ${tracking ? 'text-accent-ink' : ''}`}
              aria-label={`${!tracking ? 'Start' : paused ? 'Resume' : 'Pause'} timer for ${task.title}`}
              title={!tracking ? 'Start timer' : paused ? 'Resume' : 'Pause'}
            >
              {tracking && !paused ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              onClick={() => onOpen(task.id)}
              className={`${action} ${compact ? 'hidden' : 'hidden sm:grid'}`}
              aria-label={`Edit ${task.title}`}
              title="Edit"
            >
              <PencilLine size={14} />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

/** Placeholder rows while tasks load. */
export function TaskRowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex items-start gap-3 px-2.5 py-2.5" key={index}>
          <span className="size-5 shrink-0 animate-pulse rounded-full bg-surface-3" />
          <span className="flex-1 space-y-2">
            <span
              className="block h-3.5 animate-pulse rounded bg-surface-3"
              style={{ width: `${70 - index * 12}%` }}
            />
            <span className="block h-2.5 w-1/3 animate-pulse rounded bg-surface-2" />
          </span>
        </div>
      ))}
    </div>
  )
}
