'use client'

import { Modal } from '@/components/ui/modal'
import type { SpaceKey } from '@/types/workbench'
import { ComposeForm } from './compose-form'

export type ComposeDraft = { to?: string; subject?: string }

/** "New message" popup used by the dashboard Mail card and the Inbox (compose and reply). */
export function ComposeDialog({
  space,
  from,
  draft,
  onClose,
  onSent,
}: {
  space: SpaceKey
  from?: string
  draft: ComposeDraft
  onClose: () => void
  onSent?: () => void
}) {
  return (
    <Modal title={draft.subject ? draft.subject : 'New message'} onClose={onClose} size="xl">
      {/* A large writing surface: most of the screen's height, the editor taking the rest. */}
      <div className="flex h-[min(78dvh,860px)] min-h-[420px] flex-col">
        <ComposeForm
          space={space}
          from={from}
          defaultTo={draft.to}
          defaultSubject={draft.subject}
          onSent={() => {
            onSent?.()
            onClose()
          }}
        />
      </div>
    </Modal>
  )
}
