'use client'

import { CalendarClock, CheckSquare, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { localDate, sameDay, timeOfDay, weekRange } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting, WorkspaceTask } from '@/types/workbench'
import { durationLabel, durations, MeetingDialog } from './meeting-dialog'

function nextHour() {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return `${String(date.getHours()).padStart(2, '0')}:00`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** "Nov 2 – 8, 2026", "Oct 30 – Nov 5, 2026" or "Thursday, 5 November 2026". */
function rangeTitle(days: Date[]) {
  const first = days[0]
  const last = days[days.length - 1]
  if (days.length === 1) {
    return first.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  const month = (date: Date) => date.toLocaleDateString([], { month: 'short' })
  const end =
    first.getMonth() === last.getMonth() ? `${last.getDate()}` : `${month(last)} ${last.getDate()}`
  return `${month(first)} ${first.getDate()} – ${end}, ${last.getFullYear()}`
}

type Range = 'Day' | 'Week' | 'Month'

/** Every day shown in a month grid: whole weeks (Sunday first) covering the month. */
function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const start = weekRange(first)[0]
  const weeks = Math.ceil((first.getDay() + last.getDate()) / 7)
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index))
}

/**
 * Meetings (from `meetings`) and task due dates by day: one day, one week or a month grid,
 * with previous / next / today navigation. Click an item to edit it, or a day in the month
 * grid to open it.
 */
export function CalendarPanel({
  defaultRange = 'Week',
  compact = false,
}: {
  /** View shown first: the dashboard opens on Month, the Calendar page on Week. */
  defaultRange?: Range
  /** Shorter month cells, for the dashboard. */
  compact?: boolean
} = {}) {
  const { ready, meetings, meetingWeeks, tasks, addMeeting, addTask, loadWeek } = useWorkspace()
  const [range, setRange] = useState<Range>(defaultRange)
  /** The + menu, or which kind of item is being added. */
  const [adding, setAdding] = useState<'menu' | 'meeting' | 'todo' | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(30)
  const [link, setLink] = useState('')
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  // Dates depend on the viewer's clock, so they are filled in after mount.
  const [today, setToday] = useState<Date | null>(null)
  /** Any day inside the week (or the day) being viewed. */
  const [cursor, setCursor] = useState<Date | null>(null)

  useEffect(() => {
    setToday(new Date())
    setCursor(new Date())
  }, [])

  const weekStart = cursor ? weekRange(cursor)[0] : null
  const days = cursor
    ? range === 'Month'
      ? monthGrid(cursor)
      : range === 'Day'
        ? [cursor]
        : Array.from({ length: 7 }, (_, index) => addDays(weekStart!, index))
    : []
  // Sundays of every week on screen; meetings are fetched a week at a time.
  const weekKeys = [...new Set(days.map((day) => localDate(weekRange(day)[0])))]
  const weeksLoaded = weekKeys.every((key) => meetingWeeks.includes(key))
  const weekKeysKey = weekKeys.join(',')

  // Fetch each visible week's meetings once; kept in a ref so retries never loop on re-render.
  const loadWeekRef = useRef(loadWeek)
  useEffect(() => {
    loadWeekRef.current = loadWeek
  })
  useEffect(() => {
    if (!ready || !weekKeysKey) return
    for (const key of weekKeysKey.split(',')) {
      void loadWeekRef.current(weekRange(new Date(`${key}T12:00`))[0])
    }
  }, [ready, weekKeysKey])

  const inMonth = (day: Date) => !cursor || day.getMonth() === cursor.getMonth()
  const showsToday = today
    ? days.some((day) => sameDay(day, today) && (range !== 'Month' || inMonth(day)))
    : false
  const move = (direction: 1 | -1) => {
    if (!cursor) return
    setCursor(
      range === 'Month'
        ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1)
        : addDays(cursor, direction * (range === 'Day' ? 1 : 7)),
    )
  }
  const unit = range === 'Day' ? 'day' : range === 'Week' ? 'week' : 'month'
  const itemsOn = (day: Date) => ({
    meetings: meetings.filter((meeting) => sameDay(new Date(meeting.startsAt), day)),
    due: tasks.filter(
      (task) => task.state === 'open' && task.dueAt && sameDay(new Date(task.dueAt), day),
    ),
  })
  const openDay = (day: Date) => {
    setCursor(day)
    setRange('Day')
  }

  const openForm = (kind: 'meeting' | 'todo') => {
    const firstShown = days.find(inMonth) ?? days[0]
    setDate(localDate(showsToday || !firstShown ? new Date() : firstShown))
    setTime(kind === 'meeting' ? nextHour() : '')
    setAdding(kind)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !date) return
    if (adding === 'todo') {
      // Without a time the to-do is due at the end of the day.
      const ok = await addTask({
        title: title.trim(),
        dueAt: new Date(`${date}T${time || '23:59'}`).toISOString(),
      })
      if (ok) {
        setTitle('')
        setAdding(null)
      }
      return
    }
    if (!time) return
    const starts = new Date(`${date}T${time}`)
    const ends = new Date(starts.getTime() + duration * 60_000)
    const ok = await addMeeting({
      title: title.trim(),
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      meetingUrl: link.trim() || undefined,
    })
    if (ok) {
      setTitle('')
      setLink('')
      setAdding(null)
    }
  }

  const field =
    'h-9 min-w-0 rounded-lg border border-line-strong bg-field px-2 text-xs outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15'

  return (
    <section className="neo-card min-h-[437px] min-w-0 overflow-hidden rounded-xl p-[18px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="mr-1 text-card font-semibold">Calendar view</h2>
          <button
            type="button"
            onClick={() => today && setCursor(today)}
            disabled={!cursor || showsToday}
            className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-ui text-ink disabled:opacity-50"
          >
            Today
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={!cursor}
              className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
              aria-label={`Previous ${unit}`}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={!cursor}
              className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
              aria-label={`Next ${unit}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {days.length > 0 && cursor && (
            <p className="text-sm font-medium text-ink" aria-live="polite">
              {range === 'Month'
                ? cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })
                : rangeTitle(days)}
              {ready && !weeksLoaded && (
                <span className="ml-2 text-xs font-normal text-ink-3">Loading…</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setAdding((current) => (current ? null : 'menu'))}
              disabled={!ready}
              className="grid size-9 place-items-center rounded-lg border border-line-strong bg-surface text-secondary disabled:opacity-50"
              aria-label="Add calendar item"
              aria-expanded={adding === 'menu'}
            >
              <Plus size={15} className={`transition-transform ${adding ? 'rotate-45' : ''}`} />
            </button>
            {adding === 'menu' && (
              <div className="animate-pop absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => openForm('meeting')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-ui hover:bg-primary-subtle"
                >
                  <CalendarClock size={15} className="text-accent-ink" /> Meeting
                </button>
                <button
                  type="button"
                  onClick={() => openForm('todo')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-ui hover:bg-primary-subtle"
                >
                  <CheckSquare size={15} className="text-primary-ink" /> To-do
                </button>
              </div>
            )}
          </div>
          <div
            className="flex rounded-lg border border-line bg-surface-2 p-1"
            role="group"
            aria-label="Calendar range"
          >
            {(['Day', 'Week', 'Month'] as const).map((item) => (
              <button
                type="button"
                onClick={() => setRange(item)}
                key={item}
                aria-pressed={range === item}
                className={`h-7 rounded-md px-3 text-ui font-medium ${
                  range === item
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-ink-2 hover:bg-surface hover:text-ink'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
      {adding === 'todo' && (
        <form
          onSubmit={submit}
          className="animate-pop mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${field} px-3`}
            placeholder="To-do title"
            aria-label="To-do title"
            autoFocus
            required
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={field}
            aria-label="Due date"
            required
          />
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={field}
            aria-label="Due time (optional)"
            title="Optional: leave empty for end of day"
          />
          <button
            className="h-9 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover active:bg-primary-active"
            type="submit"
          >
            Add to-do
          </button>
        </form>
      )}
      {adding === 'meeting' && (
        <form
          onSubmit={submit}
          className="animate-pop mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${field} px-3 sm:col-span-4`}
            placeholder="Meeting or event title"
            aria-label="Event title"
            autoFocus
            required
          />
          <input
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            className={`${field} px-3`}
            placeholder="Meeting link (optional)"
            aria-label="Meeting link"
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={field}
            aria-label="Date"
            required
          />
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={field}
            aria-label="Start time"
            required
          />
          <div className="flex gap-2">
            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className={field}
              aria-label="Duration"
            >
              {durations.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {durationLabel(minutes)}
                </option>
              ))}
            </select>
            <button
              className="h-9 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover active:bg-primary-active"
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
      )}
      {range === 'Month' ? (
        <MonthGrid
          days={days}
          today={today}
          inMonth={inMonth}
          compact={compact}
          itemsOn={itemsOn}
          onOpenDay={openDay}
          onEditMeeting={setEditingMeeting}
          onEditTask={setEditingTask}
        />
      ) : (
        <div
          className={`grid min-h-[361px] gap-2 ${
            range === 'Week'
              ? 'grid-cols-2 sm:grid-cols-4 md:gap-2.5 lg:grid-cols-7'
              : 'grid-cols-1'
          }`}
        >
          {days.map((day) => {
            const { meetings: dayMeetings, due: dueTasks } = itemsOn(day)
            const isToday = today ? sameDay(day, today) : false
            return (
              <div
                className={`min-w-0 rounded-lg border p-2.5 ${
                  isToday
                    ? 'border-secondary/40 bg-secondary-subtle'
                    : 'border-line-soft bg-surface'
                }`}
                key={day.toISOString()}
              >
                <p className="flex items-center gap-1.5">
                  <span
                    className={`text-2xs font-medium uppercase tracking-[0.06em] ${isToday ? 'text-secondary' : 'text-ink-3'}`}
                  >
                    {day.toLocaleDateString([], { weekday: 'short' })}
                  </span>
                  <span
                    className={`grid size-6 place-items-center rounded-full text-ui font-semibold ${
                      isToday ? 'bg-secondary text-on-primary' : 'text-ink'
                    }`}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    {day.getDate()}
                  </span>
                </p>
                {dayMeetings.map((meeting) => (
                  <button
                    type="button"
                    key={meeting.id}
                    onClick={() => setEditingMeeting(meeting)}
                    className="mt-2 block w-full break-words rounded-md border-l-2 border-accent bg-accent-light px-2 py-1 text-left text-xs leading-4 text-accent-ink hover:brightness-95"
                    aria-label={`Edit ${meeting.title}`}
                  >
                    {timeOfDay(meeting.startsAt)} · {meeting.title}
                  </button>
                ))}
                {dueTasks.map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    onClick={() => setEditingTask(task.id)}
                    className="mt-2 block w-full break-words rounded-md border-l-2 border-secondary bg-secondary-subtle px-2 py-1 text-left text-xs leading-4 text-secondary hover:brightness-95"
                    aria-label={`Edit task ${task.title}`}
                  >
                    Due · {task.title}
                  </button>
                ))}
                {!dayMeetings.length && !dueTasks.length && range === 'Day' && (
                  <p className="mt-3 text-xs text-ink-3">Nothing scheduled.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {editingMeeting && (
        <MeetingDialog meeting={editingMeeting} onClose={() => setEditingMeeting(null)} />
      )}
      {editingTask && <TaskDialog taskId={editingTask} onClose={() => setEditingTask(null)} />}
    </section>
  )
}

const MAX_CHIPS = 3

/** Month at a glance: whole weeks, dimmed outside days, up to three items per day. */
function MonthGrid({
  days,
  today,
  inMonth,
  compact,
  itemsOn,
  onOpenDay,
  onEditMeeting,
  onEditTask,
}: {
  days: Date[]
  today: Date | null
  inMonth: (day: Date) => boolean
  compact: boolean
  itemsOn: (day: Date) => { meetings: Meeting[]; due: WorkspaceTask[] }
  onOpenDay: (day: Date) => void
  onEditMeeting: (meeting: Meeting) => void
  onEditTask: (id: string) => void
}) {
  // The dashboard's shorter cells fit two chips; the Calendar page fits three.
  const limit = compact ? 2 : MAX_CHIPS
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2">
        {days.slice(0, 7).map((day) => (
          <p
            key={day.getDay()}
            className="py-2 text-center text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3"
          >
            <span className="sm:hidden">{day.toLocaleDateString([], { weekday: 'narrow' })}</span>
            <span className="hidden sm:inline">
              {day.toLocaleDateString([], { weekday: 'short' })}
            </span>
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line">
        {days.map((day) => {
          const { meetings, due } = itemsOn(day)
          const items = [
            ...meetings.map((meeting) => ({ kind: 'meeting' as const, meeting })),
            ...due.map((task) => ({ kind: 'task' as const, task })),
          ]
          const isToday = today ? sameDay(day, today) : false
          const outside = !inMonth(day)
          const hidden = items.length - limit
          return (
            <div
              key={day.toISOString()}
              className={`group relative flex min-h-[64px] min-w-0 flex-col p-1 sm:p-1.5 ${
                compact ? 'sm:min-h-[92px]' : 'sm:min-h-[112px]'
              } ${isToday ? 'bg-secondary-subtle' : outside ? 'bg-surface-2/60' : 'bg-surface'}`}
            >
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                className={`grid size-7 place-items-center self-start rounded-full text-ui font-medium tabular-nums hover:bg-surface-3 ${
                  isToday
                    ? 'bg-secondary font-semibold text-on-primary hover:bg-secondary-hover'
                    : outside
                      ? 'text-ink-3'
                      : 'text-ink'
                }`}
                aria-label={`Open ${day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}`}
                aria-current={isToday ? 'date' : undefined}
              >
                {day.getDate()}
              </button>

              {/* Phones: one dot per item (up to three). */}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenDay(day)}
                  className="mt-auto flex justify-center gap-1 pb-1 sm:hidden"
                  aria-label={`${items.length} items`}
                >
                  {items.slice(0, limit).map((item) => (
                    <span
                      key={item.kind === 'meeting' ? item.meeting.id : item.task.id}
                      className={`size-1.5 rounded-full ${item.kind === 'meeting' ? 'bg-accent' : 'bg-secondary'}`}
                    />
                  ))}
                </button>
              )}

              {/* Larger screens: chips, then "+N more". */}
              <div className="mt-1 hidden min-w-0 space-y-1 sm:block">
                {items.slice(0, limit).map((item) =>
                  item.kind === 'meeting' ? (
                    <button
                      type="button"
                      key={item.meeting.id}
                      onClick={() => onEditMeeting(item.meeting)}
                      className="flex w-full min-w-0 items-center gap-1.5 rounded-md bg-accent-light px-1.5 py-0.5 text-left text-2xs text-accent-ink hover:brightness-95"
                      title={`${timeOfDay(item.meeting.startsAt)} · ${item.meeting.title}`}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span className="shrink-0 tabular-nums">
                        {timeOfDay(item.meeting.startsAt)}
                      </span>
                      <span className="truncate font-medium">{item.meeting.title}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      key={item.task.id}
                      onClick={() => onEditTask(item.task.id)}
                      className="flex w-full min-w-0 items-center gap-1.5 rounded-md bg-secondary-subtle px-1.5 py-0.5 text-left text-2xs text-secondary hover:brightness-95"
                      title={`Due · ${item.task.title}`}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                      <span className="truncate font-medium">{item.task.title}</span>
                    </button>
                  ),
                )}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className="px-1.5 text-2xs font-medium text-ink-2 hover:text-ink"
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
