'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { useWorkspace } from '@/state/workbench-store'
import type { SavingsGoal } from '@/types/workbench'

/** Add or edit a goal's name, target and date. Contributions are managed from the list. */
export function SavingsGoalFormModal({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const { addSavingsGoal, updateSavingsGoal, archiveSavingsGoal } = useWorkspace()
  const [name, setName] = useState(goal?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = name.trim()
    const amount = Number(targetAmount)
    if (!text || !Number.isFinite(amount) || amount <= 0) return
    setSaving(true)
    const input = { name: text, targetAmount: amount, targetDate: targetDate || null }
    const ok = goal ? await updateSavingsGoal(goal.id, input) : await addSavingsGoal(input)
    setSaving(false)
    if (ok) onClose()
  }

  const archive = async () => {
    if (!goal) return
    setSaving(true)
    const ok = await archiveSavingsGoal(goal.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'Add savings goal'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass} mt-1`}
            placeholder="Emergency fund, Travel, Motorcycle…"
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Target amount</label>
            <input
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              className={`${fieldClass} mt-1`}
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Target date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          {goal ? (
            <button type="button" onClick={archive} className="text-xs text-error-ink hover:underline">
              Archive goal
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              {goal ? 'Save changes' : 'Add goal'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
