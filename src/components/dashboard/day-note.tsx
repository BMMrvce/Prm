'use client'

import { NotebookPen, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
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
    <section className="neo-card flex min-w-0 flex-col rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={NotebookPen}
        title="Day Note"
        subtitle={
          notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'} today` : 'Today'
        }
      />
      {ready && !notes.length && (
        <EmptyState icon={NotebookPen} title="Nothing noted yet" hint="Jot down a thought below." />
      )}
      {notes.length > 0 && (
        <ul className="mt-4 flex-1 space-y-1 rounded-lg bg-warning-light/40 p-3 font-handwritten text-sm leading-6 text-ink">
          {notes.map((item, index) => (
            <li className="group flex items-start gap-2 break-words" key={`${item}-${index}`}>
              <span className="mt-[11px] size-1 shrink-0 rounded-full bg-ink-3" aria-hidden />
              <span className="min-w-0 flex-1">{item}</span>
              <button
                type="button"
                onClick={() =>
                  void saveNote(notes.filter((_, itemIndex) => itemIndex !== index).join('\n'))
                }
                className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 opacity-0 hover:bg-surface-2 hover:text-error-ink group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
                aria-label={`Remove ${item}`}
                title="Remove"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addNote} className="mt-auto flex gap-2 pt-3">
        <input
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          disabled={!ready}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Jot something down…"
          aria-label="New day note"
        />
        <button
          type="submit"
          disabled={!ready}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-on-primary disabled:opacity-60 hover:bg-primary-hover active:bg-primary-active"
          aria-label="Add day note"
        >
          <Plus size={14} />
        </button>
      </form>
    </section>
  )
}
