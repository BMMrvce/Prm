'use client'

import { ChevronDown, NotebookPen } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { useWorkspace } from '@/state/workbench-store'

/** Today's entry in `daily_notes`, the same row `DailyReflections`' history reads from. */
export function TodayReflection() {
  const { ready, note, saveNote } = useWorkspace()
  const [draft, setDraft] = useState(note)
  const [saving, setSaving] = useState(false)
  const dirty = draft !== note

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    await saveNote(draft)
    setSaving(false)
  }

  return (
    <section className="neo-card mb-4 rounded-xl p-4 sm:p-5">
      <PanelHeader icon={NotebookPen} title="Today's reflection" />
      <form onSubmit={submit} className="mt-3 space-y-2">
        <label className="block text-sm text-ink-2" htmlFor="today-reflection">
          What was the most important thing I learned today?
        </label>
        <textarea
          id="today-reflection"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!ready}
          rows={2}
          className="w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Write a line or two…"
        />
        <button
          type="submit"
          disabled={!ready || !dirty || saving}
          className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-on-primary disabled:opacity-50 hover:bg-primary-hover"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  )
}

/** Read-only history of past daily reflections, below the editable entry for today. */
export function DailyReflections() {
  const { dailyNoteHistory } = useWorkspace()
  const [open, setOpen] = useState(false)

  if (!dailyNoteHistory.length) return null

  return (
    <section className="neo-card mb-4 rounded-xl p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <PanelHeader
          icon={NotebookPen}
          title="Daily reflections"
          subtitle={`${dailyNoteHistory.length} past ${dailyNoteHistory.length === 1 ? 'entry' : 'entries'}`}
        />
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
          {dailyNoteHistory.length === 0 && <EmptyState icon={NotebookPen} title="Nothing yet" />}
          {dailyNoteHistory.map((entry) => (
            <div key={entry.date} className="border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <p className="text-xs font-medium text-ink-2">
                {new Date(entry.date).toLocaleDateString([], {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
