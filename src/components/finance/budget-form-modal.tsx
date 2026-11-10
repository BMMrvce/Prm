'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { EXPENSE_CATEGORIES } from '@/lib/finance'
import { useWorkspace } from '@/state/workbench-store'

/** Sets the overall monthly limit and an optional limit per category. */
export function BudgetFormModal({ onClose }: { onClose: () => void }) {
  const { budget, saveBudget } = useWorkspace()
  const [monthlyLimit, setMonthlyLimit] = useState(
    budget?.monthlyLimit != null ? String(budget.monthlyLimit) : '',
  )
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const category of EXPENSE_CATEGORIES) {
      const value = budget?.categoryLimits[category]
      initial[category] = value != null ? String(value) : ''
    }
    return initial
  })
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const categoryLimits: Record<string, number> = {}
    for (const category of EXPENSE_CATEGORIES) {
      const raw = limits[category].trim()
      const value = Number(raw)
      if (raw && Number.isFinite(value) && value > 0) categoryLimits[category] = value
    }
    const overallRaw = monthlyLimit.trim()
    const overallValue = Number(overallRaw)
    const ok = await saveBudget({
      monthlyLimit: overallRaw && Number.isFinite(overallValue) && overallValue >= 0 ? overallValue : null,
      categoryLimits,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title="Edit budget" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Overall monthly limit (optional)</label>
          <input
            value={monthlyLimit}
            onChange={(event) => setMonthlyLimit(event.target.value)}
            className={`${fieldClass} mt-1`}
            type="number"
            min="0"
            step="0.01"
            placeholder="No limit"
          />
        </div>
        <div>
          <p className={labelClass}>Category limits (optional)</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EXPENSE_CATEGORIES.map((category) => (
              <label key={category} className="block text-xs text-ink-2">
                {category}
                <input
                  value={limits[category]}
                  onChange={(event) =>
                    setLimits((current) => ({ ...current, [category]: event.target.value }))
                  }
                  className={`${fieldClass} mt-1 h-9`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="—"
                />
              </label>
            ))}
          </div>
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
            Save budget
          </button>
        </div>
      </form>
    </Modal>
  )
}
