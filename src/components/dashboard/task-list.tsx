'use client'

import { Clock, ListTodo, Pause, Play, Plus, Square } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { SquareCheck } from '@/components/ui/square-check'
import {
  capitalize,
  duration,
  entrySeconds,
  priorityStyle,
  shortDate,
  stopwatch,
} from '@/lib/format'
import { workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'

/** Open tasks first, then a few recently completed ones. */
const VISIBLE_TASKS = 6

export function TaskList() {
  const {
    workspace,
    ready,
    tasks,
    timeEntries,
    timer,
    toggleTask,
    addTask,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
  } = useWorkspace()
  const [newTask, setNewTask] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const open = tasks.filter((task) => task.state === 'open')
  const done = tasks.filter((task) => task.state === 'completed')
  const visible = [...open, ...done].slice(0, VISIBLE_TASKS)

  useEffect(() => {
    if (timer?.state !== 'running') return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [timer?.state])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newTask.trim()
    if (!title) return
    if (await addTask({ title })) setNewTask('')
  }

  /** Seconds logged on a task by everyone, counting a running timer live. */
  const loggedSeconds = (taskId: string) =>
    timeEntries
      .filter((entry) => entry.taskId === taskId)
      .reduce((sum, entry) => sum + entrySeconds(entry, now), 0)

  // This run of the timer, and everything logged on its task (the number shown on the task).
  const session = timer ? entrySeconds(timer, now) : 0
  const taskTotal = timer?.taskId ? loggedSeconds(timer.taskId) : session
  const paused = timer?.state === 'paused'

  return (
    <section className="neo-card flex min-h-[437px] min-w-0 max-w-full flex-col overflow-hidden rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-card font-semibold">To Do</h2>
        <span className="text-ui text-ink-2">
          {open.length} open · {done.length} done
        </span>
      </div>
      {!ready && <p className="py-6 text-center text-ui text-ink-3">Loading tasks…</p>}
      {ready && !tasks.length && (
        <EmptyState icon={ListTodo} title="No tasks yet" hint="Add your first one below." />
      )}
      <div className="space-y-4">
        {visible.map((task) => {
          const tracking = timer?.taskId === task.id
          return (
            <div className="group flex items-start gap-3" key={task.id}>
              <SquareCheck
                checked={task.state === 'completed'}
                onClick={() => void toggleTask(task.id)}
                label={`${task.state === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
              />
              <button
                type="button"
                onClick={() => setEditing(task.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className={`break-words font-handwritten text-card leading-[20px] ${task.state === 'completed' ? 'text-ink-3 line-through' : 'text-ink'}`}
                >
                  {task.title}
                </p>
                <p className="mt-0.5 truncate font-handwritten text-xs text-ink-2">
                  {task.code}
                  {task.projectName && ` · ${task.projectName}`}
                  {task.dueAt && ` · Due ${shortDate(task.dueAt)}`}
                  {task.sharedBy && ` · from ${task.sharedBy}`}
                </p>
                <TaskTime
                  seconds={loggedSeconds(task.id)}
                  estimateMinutes={task.estimateMinutes}
                  status={tracking ? (paused ? 'paused' : 'tracking') : null}
                />
              </button>
              {task.priority !== 'none' && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium sm:px-2.5 ${priorityStyle(task.priority)}`}
                >
                  {capitalize(task.priority)}
                </span>
              )}
              {task.state === 'open' && (
                <button
                  type="button"
                  onClick={() =>
                    void (!tracking ? startTimer(task.id) : paused ? resumeTimer() : pauseTimer())
                  }
                  className={`grid size-6 shrink-0 place-items-center rounded-md text-secondary hover:bg-secondary-light hover:opacity-100 ${
                    tracking ? 'bg-secondary-light opacity-100' : 'opacity-60'
                  }`}
                  aria-label={`${!tracking ? 'Start' : paused ? 'Resume' : 'Pause'} timer for ${task.title}`}
                  title={!tracking ? 'Start timer' : paused ? 'Resume' : 'Pause'}
                >
                  {tracking && !paused ? <Pause size={13} /> : <Play size={13} />}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {tasks.length > VISIBLE_TASKS && (
        <Link
          href={workspacePath(workspace.key, 'tasks')}
          className="mt-3 text-xs font-medium text-secondary"
        >
          View all {tasks.length} tasks →
        </Link>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          disabled={!ready}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-3 font-handwritten text-xs outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
          placeholder="Add a to-do item"
          aria-label="New to-do item"
        />
        <button
          type="submit"
          disabled={!ready}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-60 hover:bg-primary-hover active:bg-primary-active"
          aria-label="Add to-do item"
        >
          <Plus size={15} />
        </button>
      </form>
      {editing && <TaskDialog taskId={editing} onClose={() => setEditing(null)} />}
      <div className="neo-inset mt-auto rounded-lg p-2.5">
        {timer ? (
          <>
            <div className="flex items-center justify-between gap-2 text-2xs text-ink-2">
              <span className="flex items-center gap-1.5 font-handwritten">
                <span
                  className={`size-1.5 rounded-full ${paused ? 'bg-warning' : 'animate-pulse bg-accent'}`}
                  aria-hidden
                />
                {paused ? 'Paused' : 'Now tracking'}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void (paused ? resumeTimer() : pauseTimer())}
                  className="flex h-6 items-center gap-1 rounded-md px-1.5 font-medium text-secondary hover:bg-secondary-light"
                >
                  {paused ? <Play size={11} /> : <Pause size={11} />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={() => void stopTimer()}
                  className="flex h-6 items-center gap-1 rounded-md px-1.5 font-medium text-error-ink hover:bg-error-light"
                >
                  <Square size={10} /> Stop
                </button>
              </span>
            </div>
            <p className="mt-1 truncate font-handwritten text-ui font-medium">
              {timer.taskTitle ?? 'Untitled task'}
            </p>
            {/* Same total as the task line above; the current run is shown underneath. */}
            <span
              className={`mt-1 block font-handwritten text-xl font-semibold tabular-nums leading-none ${paused ? 'text-ink-2' : ''}`}
            >
              {stopwatch(taskTotal)}
            </span>
            <span className="mt-1 block font-handwritten text-2xs text-ink-3">
              Total on this task · this session {stopwatch(session)}
            </span>
          </>
        ) : (
          <p className="font-handwritten text-xs text-ink-2">
            No timer running. Press <Play size={11} className="inline" /> on a task to track time.
          </p>
        )}
      </div>
    </section>
  )
}

/** Time logged on a task, against its estimate when it has one. */
function TaskTime({
  seconds,
  estimateMinutes,
  status,
}: {
  seconds: number
  estimateMinutes: number | null
  /** Set while this task's timer is active. */
  status: 'tracking' | 'paused' | null
}) {
  const running = status !== null
  const over = Boolean(estimateMinutes && seconds / 60 > estimateMinutes)
  return (
    <p
      className={`mt-1 flex items-center gap-1 font-handwritten text-xs font-medium ${
        over ? 'text-error-ink' : running ? 'text-accent-ink' : 'text-secondary'
      }`}
    >
      <Clock size={12} className="shrink-0" />
      {running ? stopwatch(seconds) : duration(seconds / 60)}
      {estimateMinutes ? ` of ${duration(estimateMinutes)}` : ' logged'}
      {status && ` · ${status}`}
    </p>
  )
}
