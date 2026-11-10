'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { localDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Book } from '@/types/workbench'

/** Logs pages read, minutes spent and an optional takeaway for one book on one day. */
export function ReadingSessionForm({ book, onClose }: { book: Book; onClose: () => void }) {
  const { addReadingSession } = useWorkspace()
  const [date, setDate] = useState(localDate())
  const [pagesRead, setPagesRead] = useState(0)
  const [durationMinutes, setDurationMinutes] = useState(0)
  const [chapter, setChapter] = useState('')
  const [takeaway, setTakeaway] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const ok = await addReadingSession({
      bookId: book.id,
      date,
      pagesRead: pagesRead || null,
      durationMinutes: durationMinutes || null,
      chapter: chapter.trim() || null,
      takeaway: takeaway.trim() || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={`Log a session · ${book.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass}>Pages</label>
            <input
              type="number"
              min={0}
              value={pagesRead}
              onChange={(event) => setPagesRead(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass}>Minutes</label>
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Chapter (optional)</label>
          <input
            value={chapter}
            onChange={(event) => setChapter(event.target.value)}
            placeholder="Chapter 3: Embracing Boredom"
            className={`${fieldClass} mt-1`}
          />
        </div>
        <div>
          <label className={labelClass}>Takeaway (optional)</label>
          <textarea
            value={takeaway}
            onChange={(event) => setTakeaway(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="What stood out from this session?"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            Save session
          </button>
        </div>
      </form>
    </Modal>
  )
}
