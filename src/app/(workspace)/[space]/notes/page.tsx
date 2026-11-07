import type { Metadata } from 'next'
import { Suspense } from 'react'
import { NotesView } from '@/components/notes/notes-view'

export const metadata: Metadata = { title: 'Notes' }

export default function NotesPage() {
  return (
    <div className="mt-5">
      {/* Reads ?note= to open a note, which needs a Suspense boundary on static pages. */}
      <Suspense>
        <NotesView />
      </Suspense>
    </div>
  )
}
