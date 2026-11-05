'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Centered dialog on top of the page; Escape, the close button and the backdrop close it. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
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
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(560px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[#dedee2] bg-white p-0 text-[#222226] shadow-xl backdrop:bg-black/30"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#eeeeef] bg-white px-5 py-3.5">
        <h2 className="min-w-0 truncate text-[15px] font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-[#66666c] hover:bg-[#f2f2f4]"
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
  'h-10 w-full min-w-0 rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0] disabled:bg-[#f6f6f7] disabled:text-[#88888e]'

export const labelClass = 'block text-xs font-medium text-[#55555c]'
