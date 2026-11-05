'use client'

import { NotebookPen, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { useWorkspace } from '@/state/workbench-store'

/** Today's note, stored as one bullet per line in `daily_notes`. */
export function DayNote() {
  const { ready, note, saveNote } = useWorkspace()
  const [newNote, setNewNote] = useState('')
  const notes = note.split('\n').filter((line) => line.trim())

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = newNote.trim()
    if (!text) return
    if (await saveNote([...notes, text].join('\n'))) setNewNote('')
  }

  return (
    <section className="neo-card flex min-h-[330px] min-w-0 flex-col rounded-xl p-4">
      <h2 className="text-[15px] font-semibold">Day Note</h2>
      {ready && !notes.length && (
        <EmptyState icon={NotebookPen} title="Nothing noted yet" hint="Jot down a thought below." />
      )}
      <ul className="mt-3 flex-1 list-disc space-y-2 pl-5 text-[13px] leading-5 text-ink-2">
        {notes.map((item, index) => (
          <li className="group break-words" key={`${item}-${index}`}>
            <span>{item}</span>
            <button
              type="button"
              onClick={() =>
                void saveNote(notes.filter((_, itemIndex) => itemIndex !== index).join('\n'))
              }
              className="ml-2 text-[11px] text-ink-3 opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove ${item}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addNote} className="mt-3 flex gap-2">
        <input
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          disabled={!ready}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-xs outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
          placeholder="Add a bullet"
          aria-label="New day note"
        />
        <button
          type="submit"
          disabled={!ready}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-60 hover:bg-primary-hover active:bg-primary-active"
          aria-label="Add day note"
        >
          <Plus size={14} />
        </button>
      </form>
    </section>
  )
}
