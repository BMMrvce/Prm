'use client'

import { CalendarClock, CheckSquare, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { localDate, sameDay, timeOfDay, weekRange } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'
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

/**
 * Meetings (from `meetings`) and task due dates by day, one week or day at a time with
 * previous / next / today navigation. Click an item to edit it.
 */
export function CalendarPanel() {
  const { ready, meetings, meetingWeeks, tasks, addMeeting, addTask, loadWeek } = useWorkspace()
  const [range, setRange] = useState<'Day' | 'Week'>('Week')
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
  const weekKey = weekStart ? localDate(weekStart) : ''
  const weekLoaded = meetingWeeks.includes(weekKey)

  // Fetch the viewed week's meetings once; kept in a ref so retries never loop on re-render.
  const loadWeekRef = useRef(loadWeek)
  useEffect(() => {
    loadWeekRef.current = loadWeek
  })
  useEffect(() => {
    if (ready && weekKey) void loadWeekRef.current(weekRange(new Date(`${weekKey}T12:00`))[0])
  }, [ready, weekKey])

  const days =
    cursor && weekStart
      ? range === 'Day'
        ? [cursor]
        : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
      : []
  const showsToday = today ? days.some((day) => sameDay(day, today)) : false
  const step = range === 'Day' ? 1 : 7

  const openForm = (kind: 'meeting' | 'todo') => {
    setDate(localDate(showsToday || !days.length ? new Date() : days[0]))
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
          <h2 className="mr-1 text-[15px] font-semibold">Calendar view</h2>
          <button
            type="button"
            onClick={() => today && setCursor(today)}
            disabled={!cursor || showsToday}
            className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-[13px] text-ink disabled:opacity-50"
          >
            Today
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => cursor && setCursor(addDays(cursor, -step))}
              disabled={!cursor}
              className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
              aria-label={range === 'Day' ? 'Previous day' : 'Previous week'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => cursor && setCursor(addDays(cursor, step))}
              disabled={!cursor}
              className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
              aria-label={range === 'Day' ? 'Next day' : 'Next week'}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {days.length > 0 && (
            <p className="text-[14px] font-medium text-ink" aria-live="polite">
              {rangeTitle(days)}
              {ready && !weekLoaded && (
                <span className="ml-2 text-[12px] font-normal text-ink-3">Loading…</span>
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
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-primary-subtle"
                >
                  <CalendarClock size={15} className="text-accent-ink" /> Meeting
                </button>
                <button
                  type="button"
                  onClick={() => openForm('todo')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-primary-subtle"
                >
                  <CheckSquare size={15} className="text-primary-ink" /> To-do
                </button>
              </div>
            )}
          </div>
          {(['Day', 'Week'] as const).map((item) => (
            <button
              type="button"
              onClick={() => setRange(item)}
              key={item}
              className={`h-9 rounded-lg border px-4 text-[14px] ${
                range === item
                  ? 'border-primary bg-primary text-white hover:bg-primary-hover active:bg-primary-active'
                  : 'border-line-strong bg-surface text-ink'
              }`}
            >
              {item}
            </button>
          ))}
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
      <div
        className={`grid min-h-[361px] gap-2 ${
          range === 'Week' ? 'grid-cols-2 sm:grid-cols-4 md:gap-2.5 lg:grid-cols-7' : 'grid-cols-1'
        }`}
      >
        {days.map((day) => {
          const dayMeetings = meetings.filter((meeting) => sameDay(new Date(meeting.startsAt), day))
          const dueTasks = tasks.filter(
            (task) => task.state === 'open' && task.dueAt && sameDay(new Date(task.dueAt), day),
          )
          const isToday = today ? sameDay(day, today) : false
          return (
            <div
              className={`min-w-0 rounded-lg border p-2.5 ${
                isToday ? 'border-secondary/40 bg-secondary-subtle' : 'border-line-soft bg-surface'
              }`}
              key={day.toISOString()}
            >
              <p className="flex items-center gap-1.5">
                <span
                  className={`text-[11px] font-medium uppercase tracking-[0.06em] ${isToday ? 'text-secondary' : 'text-ink-3'}`}
                >
                  {day.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span
                  className={`grid size-6 place-items-center rounded-full text-[13px] font-semibold ${
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
                  className="mt-2 block w-full break-words rounded-md border-l-2 border-accent bg-accent-light px-2 py-1 text-left text-[12px] leading-4 text-accent-ink hover:brightness-95"
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
                  className="mt-2 block w-full break-words rounded-md border-l-2 border-secondary bg-secondary-subtle px-2 py-1 text-left text-[12px] leading-4 text-secondary hover:brightness-95"
                  aria-label={`Edit task ${task.title}`}
                >
                  Due · {task.title}
                </button>
              ))}
              {!dayMeetings.length && !dueTasks.length && range === 'Day' && (
                <p className="mt-3 text-[12px] text-ink-3">Nothing scheduled.</p>
              )}
            </div>
          )
        })}
      </div>
      {editingMeeting && (
        <MeetingDialog meeting={editingMeeting} onClose={() => setEditingMeeting(null)} />
      )}
      {editingTask && <TaskDialog taskId={editingTask} onClose={() => setEditingTask(null)} />}
    </section>
  )
}
