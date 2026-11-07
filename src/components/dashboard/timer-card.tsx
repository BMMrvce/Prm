'use client'

import { Pause, Play, Square, Timer } from 'lucide-react'
import { useState } from 'react'
import { useTaskTime } from '@/components/tasks/use-task-time'
import { PanelHeader } from '@/components/ui/panel'
import { entrySeconds, stopwatch } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

/**
 * The active time tracker: the running task with a live stopwatch and controls, or, when
 * idle, a picker to start tracking any open task.
 */
export function TimerCard() {
  const { ready, tasks, timer, startTimer, stopTimer, pauseTimer, resumeTimer } = useWorkspace()
  const { secondsFor, now } = useTaskTime()
  const [pick, setPick] = useState('')
  const open = tasks.filter((task) => task.state === 'open')
  const paused = timer?.state === 'paused'
  const session = timer ? entrySeconds(timer, now) : 0
  // Everything logged on the task (the number its row shows); this run underneath.
  const total = timer?.taskId ? secondsFor(timer.taskId) : session

  return (
    <section
      className={`neo-card min-w-0 rounded-xl p-4 sm:p-5 ${timer && !paused ? 'border-accent/50' : ''}`}
    >
      <PanelHeader
        icon={Timer}
        tone="accent"
        title="Time tracker"
        subtitle={timer ? (paused ? 'Paused' : 'Tracking now') : 'Not tracking'}
      >
        {timer && (
          <span
            className={`size-2.5 rounded-full ${paused ? 'bg-warning' : 'animate-pulse bg-accent'}`}
            aria-hidden
          />
        )}
      </PanelHeader>

      {timer ? (
        <>
          <p className="mt-4 truncate text-sm font-medium text-ink" title={timer.taskTitle ?? ''}>
            {timer.taskTitle ?? 'Untitled task'}
          </p>
          <p
            className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${paused ? 'text-ink-2' : 'text-ink'}`}
            aria-live="off"
          >
            {stopwatch(total)}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Total on this task · this session{' '}
            <span className="tabular-nums">{stopwatch(session)}</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void (paused ? resumeTimer() : pauseTimer())}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-on-primary hover:bg-primary-hover active:bg-primary-active"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => void stopTimer()}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface text-xs font-semibold text-error-ink hover:border-error/50 hover:bg-error-light"
            >
              <Square size={12} /> Stop
            </button>
          </div>
        </>
      ) : (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (pick) void startTimer(pick).then(() => setPick(''))
          }}
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink-3">00:00:00</p>
          <div className="mt-3 flex gap-2">
            <select
              value={pick}
              onChange={(event) => setPick(event.target.value)}
              disabled={!ready || !open.length}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-2.5 text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label="Task to track"
            >
              <option value="">{open.length ? 'Choose a task…' : 'No open tasks'}</option>
              {open.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.code} · {task.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!pick}
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40"
              aria-label="Start timer"
            >
              <Play size={14} />
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-3">Or press play on any task.</p>
        </form>
      )}
    </section>
  )
}
