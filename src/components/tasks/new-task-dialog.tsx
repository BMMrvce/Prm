'use client'

import { Modal } from '@/components/ui/modal'
import { TaskComposer } from './task-composer'

/** "New task" from the sidebar button or the N shortcut, available on every page. */
export function NewTaskDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="New task" onClose={onClose} wide>
      <TaskComposer variant="full" autoFocus onAdded={onClose} />
      <p className="mt-3 text-xs text-ink-3">
        Press <kbd className="rounded border border-line-strong px-1 font-sans">Enter</kbd> to add,{' '}
        <kbd className="rounded border border-line-strong px-1 font-sans">Esc</kbd> to close. Open
        the task afterwards to tag people or log time.
      </p>
    </Modal>
  )
}
