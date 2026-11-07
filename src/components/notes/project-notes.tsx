'use client'

import { NotebookText, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PanelHeader } from '@/components/ui/panel'
import { mailDate } from '@/lib/format'
import { workspacePath } from '@/lib/routes'
import { htmlToText } from '@/lib/sanitize-html'
import { useWorkspace } from '@/state/workbench-store'

/** On a project page: the notes filed under this project, and a quick way to add one. */
export function ProjectNotes({ projectId }: { projectId: string }) {
  const { workspace, ready, notes, notesCollab, addNote } = useWorkspace()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  if (!notesCollab) return null
  const list = notes.filter((note) => note.projectId === projectId)
  const href = (id: string) => `${workspacePath(workspace.key, 'notes')}?note=${id}`

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={NotebookText}
        title="Notes"
        subtitle={list.length ? `${list.length} in this project` : 'Nothing written here yet'}
      >
        <button
          type="button"
          disabled={!ready || creating}
          onClick={async () => {
            setCreating(true)
            const note = await addNote({ projectId })
            setCreating(false)
            if (note) router.push(href(note.id))
          }}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
        >
          <Plus size={14} /> New note
        </button>
      </PanelHeader>
      {list.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.slice(0, 9).map((note) => (
            <li key={note.id} className="animate-row">
              <Link
                href={href(note.id)}
                className="block rounded-lg border border-line bg-surface-2 px-3 py-2.5 hover:border-primary/50"
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">
                    {note.title || 'Untitled'}
                  </span>
                  <span className="shrink-0 text-2xs text-ink-3">{mailDate(note.updatedAt)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs text-ink-2">
                  {htmlToText(note.content) || 'No content yet'}
                </span>
                {note.members.length > 0 && (
                  <span className="mt-1 flex items-center gap-1 text-2xs text-primary-ink">
                    <Users size={11} /> {note.members.length} collaborator
                    {note.members.length === 1 ? '' : 's'}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
