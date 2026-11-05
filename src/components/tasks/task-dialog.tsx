'use client'

import { Play, Square, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { PeoplePicker } from '@/components/people/people-picker'
import { DurationInput } from '@/components/ui/duration-input'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { capitalize, duration, entrySeconds, localDate, shortDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Priority, WorkspaceTask } from '@/types/workbench'

const priorities: Priority[] = ['none', 'low', 'medium', 'high', 'urgent']

/** Edit a task: details, estimate, time spent and the people tagged on it. */
export function TaskDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks } = useWorkspace()
  const task = tasks.find((item) => item.id === taskId)
  if (!task) return null
  return <TaskEditor task={task} onClose={onClose} />
}

function TaskEditor({ task, onClose }: { task: WorkspaceTask; onClose: () => void }) {
  const {
    profile,
    projects,
    timeEntries,
    timer,
    isOwn,
    personName,
    updateTask,
    deleteTask,
    tagTask,
    untagTask,
    startTimer,
    stopTimer,
    logTime,
    deleteTimeEntry,
  } = useWorkspace()
  const own = isOwn(task.workspaceId)
  const [title, setTitle] = useState(task.title)
  const [projectId, setProjectId] = useState(task.projectId)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [due, setDue] = useState(task.dueAt ? localDate(new Date(task.dueAt)) : '')
  const [estimate, setEstimate] = useState<number | null>(task.estimateMinutes)
  const [state, setState] = useState(task.state)
  const [logDate, setLogDate] = useState(localDate())
  const [logMinutes, setLogMinutes] = useState<number | null>(null)
  const [logNote, setLogNote] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const entries = timeEntries.filter((entry) => entry.taskId === task.id)
  const tracking = timer?.taskId === task.id
  const loggedMinutes = entries.reduce((sum, entry) => sum + entrySeconds(entry, now), 0) / 60
  const ratio = estimate ? loggedMinutes / estimate : 0

  useEffect(() => {
    if (!tracking) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [tracking])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    const ok = await updateTask(task.id, {
      title: title.trim(),
      projectId,
      priority,
      // End of the chosen day, local time.
      dueAt: due ? new Date(`${due}T23:59`).toISOString() : null,
      estimateMinutes: estimate,
      state,
    })
    if (ok) onClose()
  }

  const addLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!logMinutes || !logDate) return
    const ok = await logTime({
      taskId: task.id,
      date: logDate,
      minutes: logMinutes,
      description: logNote.trim(),
    })
    if (ok) {
      setLogMinutes(null)
      setLogNote('')
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete “${task.title}”? Logged time stays in your reports.`)) return
    if (await deleteTask(task.id)) onClose()
  }

  // Projects in the same workspace, so a task never moves between workspaces.
  const projectOptions = projects.filter((item) => item.workspaceId === task.workspaceId)

  return (
    <Modal title={`${task.code} · Edit task`} onClose={onClose}>
      {task.sharedBy && (
        <p className="mb-4 rounded-lg bg-primary-subtle px-3 py-2 text-xs text-primary-ink">
          Shared by {task.sharedBy}
          {task.projectName && ` · ${task.projectName}`}
        </p>
      )}
      <form onSubmit={save} className="space-y-4">
        <label className={labelClass}>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-2`}
            maxLength={300}
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={`${fieldClass} mt-2`}
              disabled={projectOptions.length < 2}
            >
              {!projectOptions.some((item) => item.id === projectId) && (
                <option value={projectId}>{task.projectName ?? 'Project'}</option>
              )}
              {projectOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Status
            <select
              value={state}
              onChange={(event) => setState(event.target.value as WorkspaceTask['state'])}
              className={`${fieldClass} mt-2`}
            >
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className={labelClass}>
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              className={`${fieldClass} mt-2`}
            >
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {value === 'none' ? 'No priority' : capitalize(value)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Due date
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              className={`${fieldClass} mt-2`}
            />
          </label>
        </div>
        <div>
          <p className={labelClass}>Estimated time</p>
          <div className="mt-2">
            <DurationInput value={estimate} onChange={setEstimate} label="Estimated time" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover active:bg-primary-active"
          >
            Save changes
          </button>
          {(own || task.creatorId === profile?.id) && (
            <button
              type="button"
              onClick={() => void remove()}
              className="ml-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-error-ink hover:bg-error-light"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </form>

      <section className="mt-6 border-t border-line-soft pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Time taken</h3>
            <p className="text-xs text-ink-2">
              {duration(loggedMinutes)} logged
              {estimate ? ` of ${duration(estimate)} estimated` : ' · no estimate set'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void (tracking ? stopTimer() : startTimer(task.id))}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${
              tracking
                ? 'bg-error-light text-error-ink'
                : 'border border-line-strong bg-surface text-secondary'
            }`}
          >
            {tracking ? <Square size={12} /> : <Play size={12} />}
            {tracking ? 'Stop timer' : 'Start timer'}
          </button>
        </div>
        {estimate ? (
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-accent-light"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            aria-label="Time used of estimate"
          >
            <div
              className={`h-full rounded-full ${ratio > 1 ? 'bg-error' : 'bg-accent'}`}
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
          </div>
        ) : null}
        {ratio > 1 && (
          <p className="mt-1.5 text-xs text-error-ink">
            Over the estimate by {duration(loggedMinutes - (estimate ?? 0))}.
          </p>
        )}
        <form onSubmit={addLog} className="mt-4 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
          <input
            type="date"
            value={logDate}
            onChange={(event) => setLogDate(event.target.value)}
            className={fieldClass}
            aria-label="Date worked"
            required
          />
          <DurationInput value={logMinutes} onChange={setLogMinutes} label="Time spent" />
          <input
            value={logNote}
            onChange={(event) => setLogNote(event.target.value)}
            className={`${fieldClass} sm:col-span-2`}
            placeholder="What did you work on? (optional)"
            aria-label="Time note"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!logMinutes}
            className="h-10 rounded-lg border border-primary px-4 text-sm font-medium text-secondary disabled:opacity-50 sm:col-span-2"
          >
            Log time
          </button>
        </form>
        {entries.length > 0 && (
          <ul className="mt-3 divide-y divide-line-soft text-xs">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate text-ink-2">
                  {shortDate(entry.startedAt)} · {personName(entry.userId)}
                  {entry.description && ` · ${entry.description}`}
                </span>
                <span className="shrink-0 font-medium">
                  {entry.state === 'running' ? 'Running · ' : ''}
                  {duration(entrySeconds(entry, now) / 60)}
                </span>
                {entry.userId === profile?.id && entry.state !== 'running' && (
                  <button
                    type="button"
                    onClick={() => void deleteTimeEntry(entry.id)}
                    className="shrink-0 text-ink-3 hover:text-error-ink"
                    aria-label="Delete time entry"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 border-t border-line-soft pt-5">
        <h3 className="text-sm font-semibold">People</h3>
        <p className="mb-3 text-xs text-ink-2">
          {own
            ? 'Tagged people see this task on their dashboard and can update it and log time.'
            : 'People working on this task.'}
        </p>
        <PeoplePicker
          ids={task.assignees}
          canEdit={own}
          onAdd={(person) => tagTask(task.id, person)}
          onRemove={(id) => void untagTask(task.id, id)}
        />
      </section>
    </Modal>
  )
}
