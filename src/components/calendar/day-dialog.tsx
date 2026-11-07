'use client'

import { CalendarClock, CalendarRange, CheckSquare, Flag, NotebookPen } from 'lucide-react'
import { useOpenMeetingNote } from '@/components/notes/use-meeting-note'
import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { localDate, timeOfDay } from '@/lib/format'
import { meetingStyle, titleWithCategory, type MeetingCategory } from '@/lib/meetings'
import { PRIORITIES, PRIORITY } from '@/lib/tasks'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting, Priority, WorkspaceTask } from '@/types/workbench'
import { durationLabel, durations } from './meeting-dialog'

type Kind = 'meeting' | 'todo'

/** The next whole hour today, or 09:00 on any other day. */
function suggestedTime(day: Date) {
  const now = new Date()
  if (localDate(day) !== localDate(now)) return '09:00'
  const hour = Math.min(now.getHours() + 1, 23)
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * One calendar day: what is already on it (click to edit) and a form to add a meeting or a
 * to-do there. Opened by clicking a day, or the calendar's + button.
 */
export function DayDialog({
  day,
  meetings,
  tasks,
  categories,
  initialKind = 'meeting',
  initialTime,
  onClose,
  onEditMeeting,
  onEditTask,
  onOpenDay,
}: {
  day: Date
  /** Meetings and open tasks due on this day. */
  meetings: Meeting[]
  tasks: WorkspaceTask[]
  categories: MeetingCategory[] | null
  initialKind?: Kind
  /** Start time (HH:MM) picked on the day timeline. */
  initialTime?: string
  onClose: () => void
  onEditMeeting: (meeting: Meeting) => void
  onEditTask: (id: string) => void
  /** Switches the calendar to this day's Day view. */
  onOpenDay?: () => void
}) {
  const { ready, addMeeting, addTask } = useWorkspace()
  const notesLink = useOpenMeetingNote()
  const [kind, setKind] = useState<Kind>(initialKind)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localDate(day))
  const [time, setTime] = useState(
    initialTime ?? (initialKind === 'meeting' ? suggestedTime(day) : ''),
  )
  const [duration, setDuration] = useState(30)
  const [link, setLink] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [saving, setSaving] = useState(false)

  const heading = day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  const switchKind = (next: Kind) => {
    setKind(next)
    // Meetings need a start time; a to-do without one is due at the end of the day.
    setTime(next === 'meeting' ? suggestedTime(new Date(`${date}T12:00`)) : '')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text || !date || saving) return
    setSaving(true)
    let ok: boolean
    if (kind === 'todo') {
      ok = await addTask({
        title: text,
        priority,
        dueAt: new Date(`${date}T${time || '23:59'}`).toISOString(),
      })
    } else {
      const starts = new Date(`${date}T${time || '09:00'}`)
      ok = await addMeeting({
        title: titleWithCategory(
          text,
          categories?.find((item) => item.id === category),
        ),
        startsAt: starts.toISOString(),
        endsAt: new Date(starts.getTime() + duration * 60_000).toISOString(),
        meetingUrl: link.trim() || undefined,
      })
    }
    setSaving(false)
    if (ok) onClose()
  }

  const tab = (value: Kind, label: string, Icon: typeof CalendarClock) => (
    <button
      type="button"
      role="tab"
      aria-selected={kind === value}
      onClick={() => switchKind(value)}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-ui font-medium ${
        kind === value ? 'bg-segment text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  )

  return (
    <Modal title={heading} onClose={onClose}>
      {(meetings.length > 0 || tasks.length > 0) && (
        <div className="mb-5">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">
            On this day
          </p>
          <ul className="space-y-1.5">
            {meetings.map((meeting) => {
              const style = meetingStyle(meeting, categories)
              return (
                <li key={meeting.id} className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEditMeeting(meeting)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border-l-[3px] px-3 py-2 text-left text-ui hover:brightness-95 ${style.border} ${style.chip}`}
                  >
                    <span className="shrink-0 tabular-nums">{timeOfDay(meeting.startsAt)}</span>
                    <span className="truncate font-medium">{meeting.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (await notesLink.open(meeting)) onClose()
                    }}
                    disabled={notesLink.opening === meeting.id}
                    className="grid w-10 shrink-0 place-items-center rounded-lg border border-line-strong text-ink-2 hover:border-primary/50 hover:text-primary-ink disabled:opacity-50"
                    aria-label={`Notes for ${meeting.title}`}
                    title="Meeting notes"
                  >
                    <NotebookPen size={15} />
                  </button>
                </li>
              )
            })}
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onEditTask(task.id)}
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg border-l-[3px] border-primary bg-primary-subtle px-3 py-2 text-left text-ui text-primary-ink hover:brightness-95"
                >
                  <span className="shrink-0">Due</span>
                  <span className="truncate font-medium">{task.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div
          className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-1"
          role="tablist"
          aria-label="What to add"
        >
          {tab('meeting', 'Meeting', CalendarClock)}
          {tab('todo', 'To-do', CheckSquare)}
        </div>

        <label className={labelClass}>
          {kind === 'meeting' ? 'Meeting title' : 'To-do'}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={kind === 'meeting' ? 'e.g. Weekly sync' : 'e.g. Send the invoice'}
            maxLength={300}
            autoFocus
            required
          />
        </label>

        {kind === 'meeting' && categories && categories.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Meeting with"
          >
            <span className="mr-0.5 text-xs font-medium text-ink-2">With</span>
            {categories.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setCategory((current) => (current === item.id ? '' : item.id))}
                aria-pressed={category === item.id}
                className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${
                  category === item.id ? item.tab : 'border-line-strong text-ink-2 hover:text-ink'
                }`}
              >
                <span className={`size-2 rounded-full ${item.dot}`} aria-hidden />
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              required
            />
          </label>
          <label className={labelClass}>
            {kind === 'meeting' ? 'Starts' : 'Due time (optional)'}
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              required={kind === 'meeting'}
            />
          </label>
          {kind === 'meeting' ? (
            <label className={labelClass}>
              Duration
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className={`${fieldClass} mt-1.5`}
              >
                {durations.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {durationLabel(minutes)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={labelClass}>
              <span className="flex items-center gap-1">
                <Flag size={12} className={PRIORITY[priority].flag} aria-hidden /> Priority
              </span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className={`${fieldClass} mt-1.5`}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY[value].label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {kind === 'meeting' && (
          <label className={labelClass}>
            Meeting link (optional)
            <input
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="https://"
            />
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onOpenDay && (
            <button
              type="button"
              onClick={onOpenDay}
              className="mr-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <CalendarRange size={15} /> Open day view
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || !title.trim() || saving}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50"
          >
            {saving ? 'Adding…' : kind === 'meeting' ? 'Add meeting' : 'Add to-do'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
