'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Centered dialog on top of the page; Escape, the close button and the backdrop close it. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  size,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** `xl`: a large editing surface (the mail composer). */
  size?: 'xl'
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`modal-dialog m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-[var(--popover-shadow)] backdrop:bg-scrim ${
        size === 'xl'
          ? 'w-[min(1080px,calc(100vw-2rem))]'
          : wide
            ? 'w-[min(720px,calc(100vw-2rem))]'
            : 'w-[min(560px,calc(100vw-2rem))]'
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line-soft bg-surface px-5 py-3.5">
        <h2 className="min-w-0 truncate text-card font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}

export const fieldClass =
  'h-10 w-full min-w-0 rounded-lg border border-line-strong bg-field px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-2 disabled:text-ink-3'

export const labelClass = 'block text-xs font-medium text-ink-2'
