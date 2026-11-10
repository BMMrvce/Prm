'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { localDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { ContributionDirection, SavingsGoal } from '@/types/workbench'

/** Logs a contribution to, or withdrawal from, a savings goal. */
export function ContributionFormModal({
  goal,
  direction,
  onClose,
}: {
  goal: SavingsGoal
  direction: ContributionDirection
  onClose: () => void
}) {
  const { addSavingsContribution } = useWorkspace()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => localDate())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    setSaving(true)
    const ok = await addSavingsContribution({
      goalId: goal.id,
      amount: value,
      direction,
      occurredOn: date,
      note: note.trim() || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={`${direction === 'contribution' ? 'Add to' : 'Withdraw from'} ${goal.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Amount</label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={`${fieldClass} mt-1`}
              type="number"
              min="0.01"
              step="0.01"
              autoFocus
              required
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} mt-1`}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Note (optional)</label>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={240}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            {direction === 'contribution' ? 'Add' : 'Withdraw'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
