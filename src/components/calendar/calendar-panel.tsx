'use client'

import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { localDate, sameDay, timeOfDay, weekRange } from '@/lib/format'
import { meetingStyle, type MeetingCategory } from '@/lib/meetings'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting, WorkspaceTask } from '@/types/workbench'
import { DayDialog } from './day-dialog'
import { DayTimeline } from './day-timeline'
import { MeetingDialog } from './meeting-dialog'
import { useMeetingCategories } from './use-meeting-categories'

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
 * with previous / next / today navigation. Click an item to edit it; click a day (or +) to
 * see that day and add a meeting or to-do to it.
 */
export function CalendarPanel({
  defaultRange = 'Week',
  compact = false,
  side = false,
}: {
  /** View shown first: the dashboard opens on Month, the Calendar page on Week. */
  defaultRange?: Range
  /** Shorter month cells, for the dashboard. */
  compact?: boolean
  /** Narrow side column: dot markers in the month grid and stacked forms. */
  side?: boolean
} = {}) {
  const { ready, meetings, meetingWeeks, tasks, loadWeek } = useWorkspace()
  // Office and Studio color meetings by who they are with (Guru, Arjun, Client).
  const categories = useMeetingCategories()
  const [range, setRange] = useState<Range>(defaultRange)
  /** The day whose add / overview dialog is open. */
  const [dayDialog, setDayDialog] = useState<Date | null>(null)
  /** Time picked on the day timeline, prefilled in the dialog. */
  const [dayDialogTime, setDayDialogTime] = useState<string | undefined>(undefined)
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

  /** The + button adds to today when it is on screen, else the first day shown. */
  const defaultDay = () =>
    showsToday && today ? today : (days.find(inMonth) ?? days[0] ?? new Date())

  return (
    <section className="neo-card min-w-0 overflow-hidden rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-primary-ink"
            aria-hidden
          >
            <CalendarDays size={17} />
          </span>
          <h2 className="mr-1 text-card font-semibold">Calendar</h2>
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
          <button
            type="button"
            onClick={() => setDayDialog(defaultDay())}
            disabled={!ready}
            className="grid size-9 place-items-center rounded-lg border border-line-strong bg-surface text-primary-ink hover:border-primary/50 disabled:opacity-50"
            aria-label="Add a meeting or to-do"
            title="Add a meeting or to-do"
          >
            <Plus size={15} />
          </button>
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
      {range === 'Day' && cursor ? (
        <DayTimeline
          day={cursor}
          meetings={itemsOn(cursor).meetings}
          tasks={itemsOn(cursor).due}
          categories={categories}
          hourHeight={side ? 44 : 52}
          height={side ? 440 : compact ? 480 : 620}
          onAdd={(time) => {
            setDayDialogTime(time)
            setDayDialog(cursor)
          }}
          onEditMeeting={setEditingMeeting}
          onEditTask={setEditingTask}
        />
      ) : range === 'Month' ? (
        <MonthGrid
          days={days}
          today={today}
          inMonth={inMonth}
          compact={compact}
          side={side}
          categories={categories}
          itemsOn={itemsOn}
          onPickDay={setDayDialog}
          onEditMeeting={setEditingMeeting}
          onEditTask={setEditingTask}
        />
      ) : (
        <div
          className={`grid min-h-[361px] gap-2 ${
            range === 'Week' && !side
              ? 'grid-cols-2 sm:grid-cols-4 md:gap-2.5 lg:grid-cols-7'
              : 'grid-cols-1'
          }`}
        >
          {days.map((day) => {
            const { meetings: dayMeetings, due: dueTasks } = itemsOn(day)
            const isToday = today ? sameDay(day, today) : false
            return (
              <div
                className={`min-w-0 cursor-pointer rounded-lg border p-2.5 hover:border-primary/40 ${
                  isToday ? 'border-primary/40 bg-primary-subtle' : 'border-line-soft bg-surface'
                }`}
                key={day.toISOString()}
                // Empty space in the column opens the day; items keep their own clicks.
                onClick={(event) => {
                  if (event.target === event.currentTarget) setDayDialog(day)
                }}
              >
                <button
                  type="button"
                  onClick={() => setDayDialog(day)}
                  className="flex items-center gap-1.5 rounded-md pr-1 hover:bg-surface-2"
                  aria-label={`Add to ${day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}`}
                >
                  <span
                    className={`text-2xs font-medium uppercase tracking-[0.06em] ${isToday ? 'text-primary-ink' : 'text-ink-3'}`}
                  >
                    {day.toLocaleDateString([], { weekday: 'short' })}
                  </span>
                  <span
                    className={`grid size-6 place-items-center rounded-full text-ui font-semibold ${
                      isToday ? 'bg-primary text-on-primary' : 'text-ink'
                    }`}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    {day.getDate()}
                  </span>
                </button>
                {dayMeetings.map((meeting) => (
                  <button
                    type="button"
                    key={meeting.id}
                    onClick={() => setEditingMeeting(meeting)}
                    className={`mt-2 block w-full break-words rounded-md border-l-2 px-2 py-1 text-left text-xs leading-4 hover:brightness-95 ${
                      meetingStyle(meeting, categories).border
                    } ${meetingStyle(meeting, categories).chip}`}
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
                    className="mt-2 block w-full break-words rounded-md border-l-2 border-primary bg-primary-subtle px-2 py-1 text-left text-xs leading-4 text-primary-ink hover:brightness-95"
                    aria-label={`Edit task ${task.title}`}
                  >
                    Due · {task.title}
                  </button>
                ))}
                {!dayMeetings.length && !dueTasks.length && range === 'Day' && (
                  <button
                    type="button"
                    onClick={() => setDayDialog(day)}
                    className="mt-3 text-xs text-ink-3 hover:text-primary-ink"
                  >
                    Nothing scheduled. Click to add a meeting or to-do.
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {dayDialog && (
        <DayDialog
          day={dayDialog}
          initialTime={dayDialogTime}
          meetings={itemsOn(dayDialog).meetings}
          tasks={itemsOn(dayDialog).due}
          categories={categories}
          onClose={() => {
            setDayDialog(null)
            setDayDialogTime(undefined)
          }}
          onEditMeeting={(meeting) => {
            setDayDialog(null)
            setEditingMeeting(meeting)
          }}
          onEditTask={(id) => {
            setDayDialog(null)
            setEditingTask(id)
          }}
          onOpenDay={
            range === 'Day'
              ? undefined
              : () => {
                  openDay(dayDialog)
                  setDayDialog(null)
                }
          }
        />
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
  side,
  categories,
  itemsOn,
  onPickDay,
  onEditMeeting,
  onEditTask,
}: {
  days: Date[]
  today: Date | null
  inMonth: (day: Date) => boolean
  compact: boolean
  side: boolean
  categories: MeetingCategory[] | null
  itemsOn: (day: Date) => { meetings: Meeting[]; due: WorkspaceTask[] }
  /** Opens the day's dialog (its items plus adding a meeting or to-do). */
  onPickDay: (day: Date) => void
  onEditMeeting: (meeting: Meeting) => void
  onEditTask: (id: string) => void
}) {
  // The dashboard's shorter cells fit two chips; the Calendar page fits three.
  const limit = side ? 3 : compact ? 2 : MAX_CHIPS
  // Narrow columns always use dots; otherwise dots on phones and chips from sm up.
  const dots = side ? 'flex' : 'flex sm:hidden'
  const chips = side ? 'hidden' : 'hidden sm:block'
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2">
        {days.slice(0, 7).map((day) => (
          <p
            key={day.getDay()}
            className="py-2 text-center text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3"
          >
            <span className={side ? '' : 'sm:hidden'}>
              {day.toLocaleDateString([], { weekday: 'narrow' })}
            </span>
            <span className={side ? 'hidden' : 'hidden sm:inline'}>
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
              // Empty space in the cell opens the day; chips keep their own clicks.
              onClick={(event) => {
                if (event.target === event.currentTarget) onPickDay(day)
              }}
              className={`group relative flex min-w-0 cursor-pointer flex-col p-1 hover:bg-surface-2 ${
                side
                  ? 'min-h-[54px]'
                  : `min-h-[64px] sm:p-1.5 ${compact ? 'sm:min-h-[92px]' : 'sm:min-h-[112px]'}`
              } ${isToday ? 'bg-primary-subtle' : outside ? 'bg-surface-2/60' : 'bg-surface'}`}
            >
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className={`grid size-7 place-items-center self-start rounded-full text-ui font-medium tabular-nums hover:bg-surface-3 ${
                  isToday
                    ? 'bg-primary font-semibold text-on-primary hover:bg-primary-hover'
                    : outside
                      ? 'text-ink-3'
                      : 'text-ink'
                }`}
                aria-label={`${day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}: view and add`}
                aria-current={isToday ? 'date' : undefined}
              >
                {day.getDate()}
              </button>

              {/* Phones: one dot per item (up to three). */}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => onPickDay(day)}
                  className={`mt-auto justify-center gap-1 pb-1 ${dots}`}
                  aria-label={`${items.length} items`}
                  title={items
                    .map((item) =>
                      item.kind === 'meeting'
                        ? `${timeOfDay(item.meeting.startsAt)} · ${item.meeting.title}`
                        : `Due · ${item.task.title}`,
                    )
                    .join('\n')}
                >
                  {items.slice(0, limit).map((item) => (
                    <span
                      key={item.kind === 'meeting' ? item.meeting.id : item.task.id}
                      className={`size-1.5 rounded-full ${
                        item.kind === 'meeting'
                          ? meetingStyle(item.meeting, categories).dot
                          : 'bg-primary'
                      }`}
                    />
                  ))}
                </button>
              )}

              {/* Larger screens: chips, then "+N more". */}
              <div className={`mt-1 min-w-0 space-y-1 ${chips}`}>
                {items.slice(0, limit).map((item) =>
                  item.kind === 'meeting' ? (
                    <button
                      type="button"
                      key={item.meeting.id}
                      onClick={() => onEditMeeting(item.meeting)}
                      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-2xs hover:brightness-95 ${
                        meetingStyle(item.meeting, categories).chip
                      }`}
                      title={`${timeOfDay(item.meeting.startsAt)} · ${item.meeting.title}`}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${meetingStyle(item.meeting, categories).dot}`}
                        aria-hidden
                      />
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
                      className="flex w-full min-w-0 items-center gap-1.5 rounded-md bg-primary-subtle px-1.5 py-0.5 text-left text-2xs text-primary-ink hover:brightness-95"
                      title={`Due · ${item.task.title}`}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span className="truncate font-medium">{item.task.title}</span>
                    </button>
                  ),
                )}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
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
