'use client'

import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
        <p className="mt-3 text-[13px] text-[#88888e]">Nothing noted for today yet.</p>
      )}
      <ul className="mt-3 flex-1 list-disc space-y-2 pl-5 text-[13px] leading-5 text-[#5c5c62]">
        {notes.map((item, index) => (
          <li className="group break-words" key={`${item}-${index}`}>
            <span>{item}</span>
            <button
              type="button"
              onClick={() =>
                void saveNote(notes.filter((_, itemIndex) => itemIndex !== index).join('\n'))
              }
              className="ml-2 text-[10px] text-[#a0a0a6] opacity-0 group-hover:opacity-100 focus:opacity-100"
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
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8d8dc] px-3 text-xs outline-none focus:border-[#493bd0]"
          placeholder="Add a bullet"
          aria-label="New day note"
        />
        <button
          type="submit"
          disabled={!ready}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#493bd0] text-white disabled:opacity-60"
          aria-label="Add day note"
        >
          <Plus size={14} />
        </button>
      </form>
    </section>
  )
}
