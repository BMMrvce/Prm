'use client'

import { Clock, ListTodo, Play, Plus, Square } from 'lucide-react'
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

  const elapsed = timer
    ? timer.accumulatedSeconds +
      (timer.state === 'running' ? (now - new Date(timer.startedAt).getTime()) / 1000 : 0)
    : 0

  return (
    <section className="neo-card flex min-h-[437px] min-w-0 max-w-full flex-col overflow-hidden rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">To Do</h2>
        <span className="text-[13px] text-ink-2">
          {open.length} open · {done.length} done
        </span>
      </div>
      {!ready && <p className="py-6 text-center text-[13px] text-ink-3">Loading tasks…</p>}
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
                  className={`break-words font-handwritten text-[15px] leading-[18px] ${task.state === 'completed' ? 'text-ink-3 line-through' : 'text-ink'}`}
                >
                  {task.title}
                </p>
                <p className="mt-0.5 truncate font-handwritten text-[12px] text-ink-2">
                  {task.code}
                  {task.projectName && ` · ${task.projectName}`}
                  {task.dueAt && ` · Due ${shortDate(task.dueAt)}`}
                  {task.sharedBy && ` · from ${task.sharedBy}`}
                </p>
                <TaskTime
                  seconds={loggedSeconds(task.id)}
                  estimateMinutes={task.estimateMinutes}
                  running={tracking}
                />
              </button>
              {task.priority !== 'none' && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:px-2.5 ${priorityStyle(task.priority)}`}
                >
                  {capitalize(task.priority)}
                </span>
              )}
              {task.state === 'open' && !tracking && (
                <button
                  type="button"
                  onClick={() => void startTimer(task.id)}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-secondary opacity-60 hover:bg-secondary-light hover:opacity-100"
                  aria-label={`Start timer for ${task.title}`}
                >
                  <Play size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {tasks.length > VISIBLE_TASKS && (
        <Link
          href={workspacePath(workspace.key, 'tasks')}
          className="mt-3 text-[12px] font-medium text-secondary"
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
            <div className="flex items-center justify-between text-[11px] text-ink-2">
              <span className="font-handwritten">Now tracking</span>
              <button
                type="button"
                onClick={() => void stopTimer()}
                className="flex items-center gap-1 font-medium text-error-ink"
              >
                <Square size={10} /> Stop
              </button>
            </div>
            <p className="mt-1 truncate font-handwritten text-[13px] font-medium">
              {timer.taskTitle ?? 'Untitled task'}
            </p>
            <span className="mt-1 block font-handwritten text-[20px] font-semibold leading-none tracking-[-0.03em]">
              {stopwatch(elapsed)}
            </span>
          </>
        ) : (
          <p className="font-handwritten text-[12px] text-ink-2">
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
  running,
}: {
  seconds: number
  estimateMinutes: number | null
  running: boolean
}) {
  const over = Boolean(estimateMinutes && seconds / 60 > estimateMinutes)
  return (
    <p
      className={`mt-1 flex items-center gap-1 font-handwritten text-[12px] font-medium ${
        over ? 'text-error-ink' : running ? 'text-accent-ink' : 'text-secondary'
      }`}
    >
      <Clock size={12} className="shrink-0" />
      {running ? stopwatch(seconds) : duration(seconds / 60)}
      {estimateMinutes ? ` of ${duration(estimateMinutes)}` : ' logged'}
      {running && ' · tracking'}
    </p>
  )
}
