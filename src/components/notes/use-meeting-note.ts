'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'

/**
 * Opens a meeting's notes in Notes, creating them (titled with the meeting and its date,
 * with Agenda and Action items sections) the first time.
 */
export function useOpenMeetingNote() {
  const { workspace, meetingNote } = useWorkspace()
  const router = useRouter()
  const [opening, setOpening] = useState<string | null>(null)

  const open = async (meeting: Meeting) => {
    setOpening(meeting.id)
    const note = await meetingNote(meeting)
    setOpening(null)
    if (note) router.push(`${workspacePath(workspace.key, 'notes')}?note=${note.id}`)
    return Boolean(note)
  }

  return { open, opening }
}
