'use client'

import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { noteItems } from '@/lib/format'
import type { WorkspaceData } from '@/types/workbench'

export function DayNote({ workspace }: { workspace: WorkspaceData }) {
  const [notes, setNotes] = useState<string[]>(() => noteItems(workspace.note))
  const [newNote, setNewNote] = useState('')

  const addNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newNote.trim()) return
    setNotes((items) => [...items, newNote.trim()])
    setNewNote('')
  }

  return (
    <section className="neo-card min-h-[330px] rounded-xl p-4">
      <h2 className="text-[15px] font-semibold">Day Note</h2>
      <ul className="mt-3 min-h-[220px] list-disc space-y-2 pl-5 text-[13px] leading-5 text-[#5c5c62]">
        {notes.map((note, index) => (
          <li className="group" key={`${note}-${index}`}>
            <span>{note}</span>
            <button
              type="button"
              onClick={() =>
                setNotes((items) => items.filter((_, itemIndex) => itemIndex !== index))
              }
              className="ml-2 text-[10px] text-[#a0a0a6] opacity-0 group-hover:opacity-100"
              aria-label={`Remove ${note}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addNote} className="flex gap-2">
        <input
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8d8dc] px-3 text-xs outline-none focus:border-[#493bd0]"
          placeholder="Add a bullet"
          aria-label="New day note"
        />
        <button
          type="submit"
          className="grid size-9 place-items-center rounded-lg bg-[#493bd0] text-white"
          aria-label="Add day note"
        >
          <Plus size={14} />
        </button>
      </form>
    </section>
  )
}
