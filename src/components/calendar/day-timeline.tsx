'use client'

import { CheckSquare, Plus } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { localDate, sameDay, timeOfDay } from '@/lib/format'
import { meetingStyle, type MeetingCategory } from '@/lib/meetings'
import type { Meeting, WorkspaceTask } from '@/types/workbench'

const DAY_MINUTES = 24 * 60
/** Clicks snap to half hours. */
const SNAP = 30

/** Minutes since local midnight of `day`, clamped to the day. */
function minutesInto(iso: string, day: Date) {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const minutes = (new Date(iso).getTime() - start.getTime()) / 60_000
  return Math.min(DAY_MINUTES, Math.max(0, minutes))
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

function label(minutes: number) {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: minutes % 60 ? '2-digit' : undefined,
  })
}

/** A task due at the end of the day (or midnight) has no real time: it goes in "All day". */
function isAllDay(task: WorkspaceTask) {
  const due = new Date(task.dueAt!)
  const minutes = due.getHours() * 60 + due.getMinutes()
  return minutes === 0 || minutes >= 23 * 60 + 59
}

type Block = {
  key: string
  start: number
  end: number
  kind: 'meeting' | 'task'
  meeting?: Meeting
  task?: WorkspaceTask
  column: number
  columns: number
}

/**
 * Side-by-side layout for overlapping blocks: each cluster of overlapping blocks shares the
 * width, every block taking the first free column (like Google Calendar).
 */
function layout(items: Omit<Block, 'column' | 'columns'>[]): Block[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const placed: Block[] = []
  let cluster: Block[] = []
  let clusterEnd = -1
  let columnEnds: number[] = []
  const close = () => {
    const columns = columnEnds.length
    cluster.forEach((block) => (block.columns = columns))
    cluster = []
    columnEnds = []
  }
  for (const item of sorted) {
    if (item.start >= clusterEnd) close()
    let column = columnEnds.findIndex((end) => end <= item.start)
    if (column === -1) column = columnEnds.push(item.end) - 1
    else columnEnds[column] = item.end
    const block: Block = { ...item, column, columns: 1 }
    cluster.push(block)
    placed.push(block)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  close()
  return placed
}

/**
 * One day as an hour grid (like Google Calendar): meetings as blocks sized by their duration,
 * tasks due at a time as short blocks, end-of-day tasks in an "All day" strip, a line at the
 * current time, and click-to-add on any empty half hour.
 */
export function DayTimeline({
  day,
  meetings,
  tasks,
  categories,
  hourHeight = 48,
  height = 560,
  onAdd,
  onEditMeeting,
  onEditTask,
}: {
  day: Date
  meetings: Meeting[]
  /** Open tasks due on this day. */
  tasks: WorkspaceTask[]
  categories: MeetingCategory[] | null
  hourHeight?: number
  /** Visible height of the scrolling grid. */
  height?: number
  /** Add something at `time` (HH:MM). */
  onAdd: (time: string) => void
  onEditMeeting: (meeting: Meeting) => void
  onEditTask: (id: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const perMinute = hourHeight / 60
  const isToday = now ? sameDay(day, now) : false

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const allDay = tasks.filter(isAllDay)
  const blocks = layout([
    ...meetings.map((meeting) => {
      const start = minutesInto(meeting.startsAt, day)
      return {
        key: `m-${meeting.id}`,
        start,
        // Very short meetings still get room for their title.
        end: Math.max(minutesInto(meeting.endsAt, day), start + 20),
        kind: 'meeting' as const,
        meeting,
      }
    }),
    ...tasks
      .filter((task) => !isAllDay(task))
      .map((task) => {
        const start = minutesInto(task.dueAt!, day)
        return { key: `t-${task.id}`, start, end: start + 30, kind: 'task' as const, task }
      }),
  ])

  // Open on the current hour (today) or the first event, else 8 AM, with an hour of context.
  const dayKey = localDate(day)
  useLayoutEffect(() => {
    const target = sameDay(day, new Date())
      ? new Date().getHours() * 60
      : blocks.length
        ? Math.min(...blocks.map((block) => block.start))
        : 8 * 60
    scroller.current?.scrollTo({ top: Math.max(0, (target - 60) * perMinute) })
    // Only when the day changes, not on every data update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  const slotAt = (clientY: number) => {
    const rect = grid.current?.getBoundingClientRect()
    if (!rect) return null
    const minutes = (clientY - rect.top) / perMinute
    return Math.min(DAY_MINUTES - SNAP, Math.max(0, Math.floor(minutes / SNAP) * SNAP))
  }

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : 0

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      {/* All day: tasks due by the end of the day. */}
      <div className="flex min-h-10 items-start gap-2 border-b border-line bg-surface-2/60 px-2 py-1.5">
        <span className="w-12 shrink-0 whitespace-nowrap pt-1 text-right text-2xs font-medium text-ink-3">
          All day
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {allDay.length ? (
            allDay.map((task) => (
              <button
                type="button"
                key={task.id}
                onClick={() => onEditTask(task.id)}
                className="animate-row flex min-w-0 max-w-full items-center gap-1.5 rounded-md border-l-2 border-primary bg-primary-subtle px-2 py-1 text-left text-xs text-primary-ink hover:brightness-95"
                title={`Due · ${task.title}`}
              >
                <CheckSquare size={12} className="shrink-0" />
                <span className="truncate font-medium">{task.title}</span>
              </button>
            ))
          ) : (
            <span className="pt-1 text-2xs text-ink-3">No tasks due</span>
          )}
        </div>
      </div>

      <div ref={scroller} className="overflow-y-auto overscroll-contain" style={{ height }}>
        <div className="relative flex" style={{ height: 24 * hourHeight }}>
          {/* Hour labels */}
          <div className="relative w-14 shrink-0 border-r border-line-soft" aria-hidden>
            {Array.from({ length: 24 }, (_, hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-2xs tabular-nums text-ink-3"
                style={{ top: hour * hourHeight }}
              >
                {hour ? label(hour * 60) : ''}
              </span>
            ))}
          </div>

          {/* The grid: lines every hour (solid) and half hour (dashed); click to add. */}
          <div
            ref={grid}
            role="button"
            tabIndex={-1}
            aria-label="Add at a time"
            className="relative flex-1 cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(to bottom, var(--border) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)`,
              backgroundSize: `100% ${hourHeight}px, 100% ${hourHeight}px`,
              backgroundPosition: `0 0, 0 ${hourHeight / 2}px`,
            }}
            onMouseMove={(event) => {
              if (event.target !== event.currentTarget) return setHover(null)
              setHover(slotAt(event.clientY))
            }}
            onMouseLeave={() => setHover(null)}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return
              const slot = slotAt(event.clientY)
              if (slot !== null) onAdd(clock(slot))
            }}
          >
            {/* Ghost of the half hour a click would add to. */}
            {hover !== null && (
              <div
                className="pointer-events-none absolute inset-x-1 flex items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary-subtle/70 px-2 text-2xs font-medium text-primary-ink"
                style={{ top: hover * perMinute + 1, height: SNAP * perMinute - 2 }}
              >
                <Plus size={11} /> {label(hover)}
              </div>
            )}

            {blocks.map((block) => {
              const top = block.start * perMinute
              const blockHeight = Math.max(18, (block.end - block.start) * perMinute - 2)
              const width = 100 / block.columns
              const position = {
                top: top + 1,
                height: blockHeight,
                left: `calc(${block.column * width}% + 4px)`,
                width: `calc(${width}% - 8px)`,
              }
              const tight = blockHeight < 38
              if (block.kind === 'task') {
                const task = block.task!
                return (
                  <button
                    type="button"
                    key={block.key}
                    onClick={() => onEditTask(task.id)}
                    className="animate-row absolute z-[1] flex min-w-0 items-center gap-1 overflow-hidden rounded-md border border-dashed border-primary/60 bg-surface px-2 text-left text-2xs text-primary-ink shadow-sm hover:bg-primary-subtle"
                    style={position}
                    title={`Due ${timeOfDay(task.dueAt!)} · ${task.title}`}
                  >
                    <CheckSquare size={11} className="shrink-0" />
                    <span className="truncate font-medium">{task.title}</span>
                  </button>
                )
              }
              const meeting = block.meeting!
              const style = meetingStyle(meeting, categories)
              const ended = now ? new Date(meeting.endsAt) < now : false
              return (
                <button
                  type="button"
                  key={block.key}
                  onClick={() => onEditMeeting(meeting)}
                  className={`animate-row absolute z-[1] min-w-0 overflow-hidden rounded-md border-l-[3px] px-2 text-left shadow-sm hover:brightness-95 ${style.border} ${style.chip} ${
                    tight ? 'flex items-center gap-1.5 py-0' : 'py-1'
                  } ${ended ? 'opacity-60' : ''}`}
                  style={position}
                  title={`${timeOfDay(meeting.startsAt)}–${timeOfDay(meeting.endsAt)} · ${meeting.title}`}
                >
                  <span
                    className={`block truncate text-xs font-semibold ${tight ? 'min-w-0' : ''}`}
                  >
                    {meeting.title}
                  </span>
                  <span
                    className={`block truncate text-2xs tabular-nums opacity-80 ${tight ? 'shrink-0' : ''}`}
                  >
                    {timeOfDay(meeting.startsAt)}–{timeOfDay(meeting.endsAt)}
                    {!tight && meeting.location ? ` · ${meeting.location}` : ''}
                  </span>
                </button>
              )
            })}

            {/* Now */}
            {isToday && (
              <div
                className="pointer-events-none absolute inset-x-0 z-[2] flex items-center"
                style={{ top: nowMinutes * perMinute }}
                aria-label={`Now, ${label(nowMinutes)}`}
              >
                <span className="-ml-1.5 size-3 rounded-full bg-error ring-2 ring-surface" />
                <span className="h-0.5 flex-1 bg-error" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
