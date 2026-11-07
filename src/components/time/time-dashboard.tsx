'use client'

import { Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { BarRows, ColumnChart, Legend, SERIES, StatTile } from '@/components/charts/charts'
import { DurationInput } from '@/components/ui/duration-input'
import { fieldClass } from '@/components/ui/modal'
import { duration, entrySeconds, localDate, shortDate, weekRange } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const

const DAY_MS = 86_400_000

function startOfDay(date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

/** Your tracked time in this workspace: totals, trends, projects and estimates. */
export function TimeDashboard() {
  const { ready, profile, tasks, timeEntries, logTime, deleteTimeEntry } = useWorkspace()
  const [range, setRange] = useState<(typeof RANGES)[number]['days']>(7)
  // Charts depend on the viewer's clock, so they render after mount.
  const [now, setNow] = useState<number | null>(null)
  const [taskId, setTaskId] = useState('')
  const [date, setDate] = useState('')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setNow(Date.now())
    setDate(localDate())
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!ready || now === null) {
    return <p className="text-sm text-ink-3">Loading time entries…</p>
  }

  const today = startOfDay(new Date(now))
  const rangeStart = new Date(today.getTime() - (range - 1) * DAY_MS)
  const mine = timeEntries.filter((entry) => entry.userId === profile?.id)
  const minutesOf = (entry: (typeof mine)[number]) => entrySeconds(entry, now) / 60
  const inRange = mine.filter((entry) => new Date(entry.startedAt) >= rangeStart)
  const sum = (list: typeof mine) => list.reduce((total, entry) => total + minutesOf(entry), 0)

  const todayTotal = sum(mine.filter((entry) => new Date(entry.startedAt) >= today))
  const weekTotal = sum(mine.filter((entry) => new Date(entry.startedAt) >= weekRange()[0]))
  const rangeTotal = sum(inRange)

  // Daily columns for 7 and 30 days, weekly columns for 90 days.
  const bucketDays = range === 90 ? 7 : 1
  const bucketCount = Math.ceil(range / bucketDays)
  const firstBucket =
    bucketDays === 7
      ? weekRange(new Date(today.getTime() - (bucketCount - 1) * 7 * DAY_MS))[0]
      : rangeStart
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(firstBucket)
    start.setDate(start.getDate() + index * bucketDays)
    const end = new Date(start)
    end.setDate(start.getDate() + bucketDays)
    const total = sum(
      mine.filter((entry) => {
        const at = new Date(entry.startedAt)
        return at >= start && at < end
      }),
    )
    const label =
      range === 7
        ? start.toLocaleDateString([], { weekday: 'short' })
        : start.toLocaleDateString([], {
            day: 'numeric',
            month: range === 90 ? 'short' : undefined,
          })
    const detail =
      bucketDays === 7
        ? `Week of ${start.toLocaleDateString([], { day: 'numeric', month: 'short' })}`
        : start.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
    // Columns are plotted in hours so the axis lands on whole numbers.
    return { label, detail, values: [total / 60] }
  })

  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const byProject = new Map<string, number>()
  for (const entry of inRange) {
    const task = entry.taskId ? taskById.get(entry.taskId) : undefined
    const name = task?.projectName ?? (entry.taskId ? 'Other tasks' : 'No task')
    byProject.set(name, (byProject.get(name) ?? 0) + minutesOf(entry))
  }
  const projectRows = [...byProject]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, values: [value] }))

  // Estimate vs time logged by everyone on the task.
  const logged = new Map<string, number>()
  for (const entry of timeEntries) {
    if (entry.taskId) logged.set(entry.taskId, (logged.get(entry.taskId) ?? 0) + minutesOf(entry))
  }
  const estimated = tasks.filter((task) => task.estimateMinutes)
  const estimateRows = estimated
    .filter((task) => logged.get(task.id) || task.state === 'open')
    .slice(0, 8)
    .map((task) => ({
      label: `${task.code} · ${task.title}`,
      values: [logged.get(task.id) ?? 0, task.estimateMinutes ?? 0],
    }))
  const finished = estimated.filter((task) => task.state === 'completed' && logged.get(task.id))
  const accuracy = finished.length
    ? finished.reduce((total, task) => total + (logged.get(task.id) ?? 0), 0) /
      finished.reduce((total, task) => total + (task.estimateMinutes ?? 0), 0)
    : null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!minutes || !date) return
    const ok = await logTime({
      taskId: taskId || null,
      date,
      minutes,
      description: note.trim(),
    })
    if (ok) {
      setMinutes(null)
      setNote('')
    }
  }

  const recent = inRange.slice(0, 25)
  const card = 'neo-card min-w-0 rounded-xl p-5'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-lg bg-surface-3 p-0.5 text-xs font-medium"
          role="group"
          aria-label="Range"
        >
          {RANGES.map((option) => (
            <button
              type="button"
              key={option.days}
              onClick={() => setRange(option.days)}
              aria-pressed={range === option.days}
              className={`rounded-md px-3 py-1.5 ${range === option.days ? 'bg-segment shadow-sm' : 'text-ink-2'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-2">Your own tracked time in this workspace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Today" value={duration(todayTotal)} />
        <StatTile label="This week" value={duration(weekTotal)} note="Since Sunday" />
        <StatTile
          label={`Daily average · ${range} days`}
          value={duration(rangeTotal / range)}
          note={`${duration(rangeTotal)} in total`}
        />
        <StatTile
          label="Estimates used"
          value={accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`}
          note={
            accuracy === null
              ? 'Complete a task with an estimate'
              : accuracy > 1
                ? 'Tasks take longer than estimated'
                : 'Tasks finish within estimates'
          }
        />
      </div>

      <section className={card}>
        <h3 className="font-semibold">{range === 90 ? 'Hours per week' : 'Hours per day'}</h3>
        <p className="mb-4 text-xs text-ink-2">Hover a column for the exact time.</p>
        <ColumnChart
          data={buckets}
          series={[{ name: 'Tracked', color: SERIES[0] }]}
          format={(value) => duration(value * 60)}
          axisFormat={(value) => `${value}h`}
          labelEvery={range === 30 ? 5 : range === 90 ? 2 : 1}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={card}>
          <h3 className="font-semibold">Time by project</h3>
          <p className="mb-4 text-xs text-ink-2">Last {range} days</p>
          {projectRows.length ? (
            <BarRows
              rows={projectRows}
              series={[{ name: 'Tracked', color: SERIES[0] }]}
              format={duration}
            />
          ) : (
            <p className="text-sm text-ink-3">No time tracked in this period.</p>
          )}
        </section>
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">Estimate vs time taken</h3>
              <p className="text-xs text-ink-2">Tasks with an estimate, time from everyone</p>
            </div>
            <Legend
              series={[
                { name: 'Time taken', color: SERIES[0] },
                { name: 'Estimate', color: SERIES[1] },
              ]}
            />
          </div>
          {estimateRows.length ? (
            <BarRows
              rows={estimateRows}
              series={[
                { name: 'Time taken', color: SERIES[0] },
                { name: 'Estimate', color: SERIES[1] },
              ]}
              format={duration}
            />
          ) : (
            <p className="text-sm text-ink-3">
              Add an estimate to a task (open it from My Tasks) to compare it here.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className={`${card} space-y-3`}>
          <h3 className="font-semibold">Log time</h3>
          <select
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            className={fieldClass}
            aria-label="Task"
          >
            <option value="">No task</option>
            {tasks
              .filter((task) => task.state === 'open')
              .map((task) => (
                <option key={task.id} value={task.id}>
                  {task.code} · {task.title}
                </option>
              ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={fieldClass}
            aria-label="Date worked"
            required
          />
          <DurationInput value={minutes} onChange={setMinutes} label="Time spent" />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
            placeholder="Note (optional)"
            aria-label="Note"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!minutes}
            className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-on-primary disabled:opacity-50 hover:bg-primary-hover active:bg-primary-active"
          >
            Log time
          </button>
        </form>

        <section className="neo-card min-w-0 overflow-hidden rounded-xl">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-semibold">Time entries</h3>
            <p className="text-xs text-ink-2">Last {range} days</p>
          </div>
          {!recent.length && (
            <p className="px-5 py-8 text-center text-sm text-ink-3">
              No time yet. Start a timer on a task or log time here.
            </p>
          )}
          <table className="w-full table-fixed text-sm">
            <tbody className="divide-y divide-line-soft">
              {recent.map((entry) => {
                const task = entry.taskId ? taskById.get(entry.taskId) : undefined
                return (
                  <tr key={entry.id}>
                    <td className="hidden w-28 px-5 py-3 text-xs text-ink-2 sm:table-cell">
                      {shortDate(entry.startedAt)}
                    </td>
                    <td className="px-5 py-3 sm:px-0">
                      <p className="truncate font-medium">
                        {task?.title ?? entry.taskTitle ?? 'No task'}
                      </p>
                      <p className="truncate text-xs text-ink-2">
                        <span className="sm:hidden">{shortDate(entry.startedAt)} · </span>
                        {task?.projectName ?? ''}
                        {entry.description && ` · ${entry.description}`}
                      </p>
                    </td>
                    <td className="w-24 px-2 py-3 text-right text-xs font-semibold tabular-nums">
                      {entry.state === 'running' ? 'Running' : duration(minutesOf(entry))}
                    </td>
                    <td className="w-12 py-3 pr-4 text-right">
                      {entry.state !== 'running' && (
                        <button
                          type="button"
                          onClick={() => void deleteTimeEntry(entry.id)}
                          className="text-ink-3 hover:text-error-ink"
                          aria-label="Delete time entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
