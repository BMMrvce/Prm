'use client'

import { CalendarClock, ExternalLink, MapPin, NotebookPen } from 'lucide-react'
import { useMeetingCategories } from '@/components/calendar/use-meeting-categories'
import { useOpenMeetingNote } from '@/components/notes/use-meeting-note'
import { timeOfDay } from '@/lib/format'
import { meetingStyle } from '@/lib/meetings'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'

/** "Now", "In 25 min", "Ended", "Tue 10 Nov", for the meeting's status chip. */
function when(meeting: Meeting, now: Date) {
  const starts = new Date(meeting.startsAt).getTime()
  const ends = new Date(meeting.endsAt).getTime()
  const at = now.getTime()
  if (at >= starts && at < ends) return { text: 'Now', tone: 'live' as const }
  if (at >= ends) return { text: 'Ended', tone: 'past' as const }
  const minutes = Math.round((starts - at) / 60_000)
  if (minutes <= 90) return { text: `In ${minutes} min`, tone: 'soon' as const }
  const today = new Date(meeting.startsAt).toDateString() === now.toDateString()
  return {
    text: today
      ? 'Today'
      : new Date(meeting.startsAt).toLocaleDateString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
    tone: 'later' as const,
  }
}

/**
 * A meeting listed among tasks: its time, who it is with (category color), a live / soon /
 * ended chip, and quick Join and Notes buttons. Clicking it opens the meeting.
 */
export function MeetingRow({
  meeting,
  now,
  onOpen,
  compact = false,
}: {
  meeting: Meeting
  now: Date
  onOpen: (meeting: Meeting) => void
  compact?: boolean
}) {
  const categories = useMeetingCategories()
  const { notes } = useWorkspace()
  const notesLink = useOpenMeetingNote()
  const style = meetingStyle(meeting, categories)
  const status = when(meeting, now)
  const ended = status.tone === 'past'
  const hasNote = notes.some((note) => note.meetingId === meeting.id)
  const action =
    'grid size-7 place-items-center rounded-md text-ink-2 hover:bg-surface-3 hover:text-ink'

  return (
    <div
      className={`animate-row group relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-surface-2 focus-within:bg-surface-2 ${
        ended ? 'opacity-60' : ''
      }`}
    >
      <span
        className={`mt-px grid size-5 shrink-0 place-items-center rounded-md ${style.chip}`}
        aria-hidden
      >
        <CalendarClock size={12} />
      </span>
      <button type="button" onClick={() => onOpen(meeting)} className="min-w-0 flex-1 text-left">
        <span className="block break-words text-sm font-medium leading-5 text-ink">
          {meeting.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <span className={`size-2 rounded-full ${style.dot}`} aria-hidden />
            {timeOfDay(meeting.startsAt)}–{timeOfDay(meeting.endsAt)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-1.5 text-2xs font-semibold ${
              status.tone === 'live'
                ? 'bg-success-light text-success-ink'
                : status.tone === 'soon'
                  ? 'bg-accent-light text-accent-ink'
                  : 'bg-surface-2 text-ink-2'
            }`}
          >
            {status.tone === 'live' && (
              <span className="mr-1 size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
            )}
            {status.text}
          </span>
          {meeting.location && !compact && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin size={11} aria-hidden /> {meeting.location}
            </span>
          )}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-0.5">
        {meeting.meetingUrl && !ended && (
          <a
            href={meeting.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${action} ${status.tone === 'live' || status.tone === 'soon' ? 'text-primary-ink' : ''}`}
            aria-label={`Join ${meeting.title}`}
            title="Join"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          type="button"
          onClick={() => void notesLink.open(meeting)}
          disabled={notesLink.opening === meeting.id}
          className={`${action} ${hasNote ? 'text-primary-ink' : ''} disabled:opacity-50`}
          aria-label={`Notes for ${meeting.title}`}
          title={hasNote ? 'Open meeting notes' : 'Take meeting notes'}
        >
          <NotebookPen size={14} />
        </button>
      </span>
    </div>
  )
}
