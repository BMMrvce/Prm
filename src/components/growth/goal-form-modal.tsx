'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { useWorkspace } from '@/state/workbench-store'
import type { Goal, GoalCategory } from '@/types/workbench'

const CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: 'career', label: 'Career' },
  { value: 'financial', label: 'Financial' },
  { value: 'personal_development', label: 'Personal Development' },
  { value: 'learning', label: 'Learning' },
  { value: 'other', label: 'Other' },
]

/** Add or edit a goal: category, target date and notes. Milestones are managed in the list. */
export function GoalFormModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { addGoal, updateGoal, deleteGoal } = useWorkspace()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'career')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [notes, setNotes] = useState(goal?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text) return
    setSaving(true)
    const input = {
      title: text,
      category,
      targetDate: targetDate || null,
      notes: notes.trim() || null,
    }
    const ok = goal ? await updateGoal(goal.id, input) : await addGoal(input)
    setSaving(false)
    if (ok) onClose()
  }

  const remove = async () => {
    if (!goal) return
    setSaving(true)
    const ok = await deleteGoal(goal.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'Add goal'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-1`}
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as GoalCategory)}
              className={`${fieldClass} mt-1`}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
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
        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          {goal ? (
            <button type="button" onClick={remove} className="text-xs text-error-ink hover:underline">
              Delete goal
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
