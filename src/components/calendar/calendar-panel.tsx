'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
  const { ready, meetings, meetingWeeks, tasks, addMeeting, loadWeek } = useWorkspace()
  const [range, setRange] = useState<'Day' | 'Week'>('Week')
  const [showAdd, setShowAdd] = useState(false)
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

  const openForm = () => {
    setDate(localDate(showsToday || !days.length ? new Date() : days[0]))
    setTime(nextHour())
    setShowAdd((visible) => !visible)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !date || !time) return
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
      setShowAdd(false)
    }
  }

  const field =
    'h-9 min-w-0 rounded-lg border border-[#d8d8dc] bg-white px-2 text-xs outline-none focus:border-[#493bd0]'

  return (
    <section className="neo-card min-h-[437px] min-w-0 overflow-hidden rounded-xl p-[18px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="mr-1 text-[15px] font-semibold">Calendar view</h2>
          <button
            type="button"
            onClick={() => today && setCursor(today)}
            disabled={!cursor || showsToday}
            className="h-9 rounded-lg border border-[#d8d8dc] bg-white px-3 text-[13px] text-[#333338] disabled:opacity-50"
          >
            Today
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => cursor && setCursor(addDays(cursor, -step))}
              disabled={!cursor}
              className="grid size-9 place-items-center rounded-full text-[#45454a] hover:bg-[#f0f0f3]"
              aria-label={range === 'Day' ? 'Previous day' : 'Previous week'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => cursor && setCursor(addDays(cursor, step))}
              disabled={!cursor}
              className="grid size-9 place-items-center rounded-full text-[#45454a] hover:bg-[#f0f0f3]"
              aria-label={range === 'Day' ? 'Next day' : 'Next week'}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {days.length > 0 && (
            <p className="text-[14px] font-medium text-[#333338]" aria-live="polite">
              {rangeTitle(days)}
              {ready && !weekLoaded && (
                <span className="ml-2 text-[12px] font-normal text-[#99999f]">Loading…</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openForm}
            disabled={!ready}
            className="grid size-9 place-items-center rounded-lg border border-[#d8d8dc] bg-white text-[#493bd0] disabled:opacity-50"
            aria-label="Add calendar item"
          >
            <Plus size={15} />
          </button>
          {(['Day', 'Week'] as const).map((item) => (
            <button
              type="button"
              onClick={() => setRange(item)}
              key={item}
              className={`h-9 rounded-lg border px-4 text-[14px] ${
                range === item
                  ? 'border-[#4638ca] bg-[#4638ca] text-white'
                  : 'border-[#d8d8dc] bg-white text-[#333338]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {showAdd && (
        <form
          onSubmit={submit}
          className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${field} px-3 sm:col-span-4`}
            placeholder="Meeting or event title"
            aria-label="Event title"
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
              className="h-9 rounded-lg bg-[#493bd0] px-3 text-xs font-medium text-white"
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
              className={`neo-inset min-w-0 rounded-lg p-2.5 ${isToday ? 'border-[#a9a4ec]' : ''}`}
              key={day.toISOString()}
            >
              <p
                className={`text-[13px] ${isToday ? 'font-semibold text-[#3e34ad]' : 'text-[#616168]'}`}
              >
                {day.toLocaleDateString([], { weekday: 'short' })} {day.getDate()}
              </p>
              {dayMeetings.map((meeting) => (
                <button
                  type="button"
                  key={meeting.id}
                  onClick={() => setEditingMeeting(meeting)}
                  className="mt-2 block w-full break-words rounded-md bg-[#fff4c8] px-2 py-1 text-left text-[11px] leading-4 text-[#7d5b00] hover:ring-1 hover:ring-[#e5c75a]"
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
                  className="mt-2 block w-full break-words rounded-md bg-[#eeedff] px-2 py-1 text-left text-[11px] leading-4 text-[#3e34ad] hover:ring-1 hover:ring-[#a9a4ec]"
                  aria-label={`Edit task ${task.title}`}
                >
                  Due · {task.title}
                </button>
              ))}
              {!dayMeetings.length && !dueTasks.length && range === 'Day' && (
                <p className="mt-3 text-[12px] text-[#99999f]">Nothing scheduled.</p>
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
