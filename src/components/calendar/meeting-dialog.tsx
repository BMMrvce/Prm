'use client'

import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { localDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'

export const durations = [15, 30, 45, 60, 90, 120, 180, 240]

export const durationLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.round((minutes / 60) * 10) / 10} h`

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/** Edit or delete a calendar item. */
export function MeetingDialog({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const { updateMeeting, deleteMeeting } = useWorkspace()
  const starts = new Date(meeting.startsAt)
  const length = Math.round((new Date(meeting.endsAt).getTime() - starts.getTime()) / 60_000)
  const [title, setTitle] = useState(meeting.title)
  const [link, setLink] = useState(meeting.meetingUrl ?? '')
  const [date, setDate] = useState(localDate(starts))
  const [time, setTime] = useState(clock(starts))
  const [minutes, setMinutes] = useState(length)
  const options = durations.includes(length)
    ? durations
    : [...durations, length].sort((a, b) => a - b)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !date || !time) return
    const start = new Date(`${date}T${time}`)
    const ok = await updateMeeting(meeting.id, {
      title: title.trim(),
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
      meetingUrl: link.trim() || undefined,
    })
    if (ok) onClose()
  }

  const remove = async () => {
    if (!window.confirm(`Remove “${meeting.title}” from the calendar?`)) return
    if (await deleteMeeting(meeting.id)) onClose()
  }

  return (
    <Modal title="Edit calendar item" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <label className={labelClass}>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-2`}
            required
          />
        </label>
        <label className={labelClass}>
          Meeting link
          <input
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            className={`${fieldClass} mt-2`}
            placeholder="https://"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} mt-2`}
              required
            />
          </label>
          <label className={labelClass}>
            Starts
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={`${fieldClass} mt-2`}
              required
            />
          </label>
          <label className={labelClass}>
            Duration
            <select
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className={`${fieldClass} mt-2`}
            >
              {options.map((value) => (
                <option key={value} value={value}>
                  {durationLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#493bd0] px-5 text-sm font-medium text-white"
          >
            Save changes
          </button>
          {meeting.meetingUrl && (
            <a
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center rounded-lg border border-[#d8d8dc] px-4 text-sm"
            >
              Join
            </a>
          )}
          <button
            type="button"
            onClick={() => void remove()}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-[#a52828] hover:bg-[#fdf0f0]"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </form>
    </Modal>
  )
}
