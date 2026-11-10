'use client'

import { Check, Minus } from 'lucide-react'
import type { HabitEntryStatus } from '@/types/workbench'

/**
 * Three states for a day: completed, skipped (a rest day, never a failure) or unset.
 * Setting the state already shown clears it (undo), matching the store's toggle semantics.
 */
export function ThreeStateToggle({
  status,
  onSet,
}: {
  status: HabitEntryStatus | null
  onSet: (status: HabitEntryStatus) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onSet('completed')}
        className={`grid size-7 place-items-center rounded-md border transition ${
          status === 'completed'
            ? 'border-success bg-success-light text-success-ink'
            : 'border-line-strong bg-field text-ink-3 hover:border-success'
        }`}
        aria-label="Mark completed"
        aria-pressed={status === 'completed'}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={() => onSet('skipped')}
        className={`grid size-7 place-items-center rounded-md border transition ${
          status === 'skipped'
            ? 'border-line-strong bg-surface-2 text-ink-2'
            : 'border-line-strong bg-field text-ink-3 hover:border-ink-2'
        }`}
        aria-label="Mark as a rest day — skipped, not failed"
        aria-pressed={status === 'skipped'}
      >
        <Minus size={13} strokeWidth={3} />
      </button>
    </div>
  )
}
