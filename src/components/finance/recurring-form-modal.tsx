'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/finance'
import { localDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { RecurringFrequency, RecurringPayment } from '@/types/workbench'

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

/** Add or edit a recurring commitment: a schedule only, never an auto-posted transaction. */
export function RecurringFormModal({
  payment,
  onClose,
}: {
  payment: RecurringPayment | null
  onClose: () => void
}) {
  const { addRecurringPayment, updateRecurringPayment, deleteRecurringPayment } = useWorkspace()
  const [name, setName] = useState(payment?.name ?? '')
  const [kind, setKind] = useState<'expense' | 'income'>(payment?.kind ?? 'expense')
  const [category, setCategory] = useState(payment?.category ?? EXPENSE_CATEGORIES[0])
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '')
  const [frequency, setFrequency] = useState<RecurringFrequency>(payment?.frequency ?? 'monthly')
  const [nextDueDate, setNextDueDate] = useState(payment?.nextDueDate ?? localDate())
  const [saving, setSaving] = useState(false)
  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = name.trim()
    const value = Number(amount)
    if (!text || !Number.isFinite(value) || value <= 0) return
    setSaving(true)
    const input = { name: text, kind, category, amount: value, frequency, nextDueDate }
    const ok = payment ? await updateRecurringPayment(payment.id, input) : await addRecurringPayment(input)
    setSaving(false)
    if (ok) onClose()
  }

  const remove = async () => {
    if (!payment) return
    setSaving(true)
    const ok = await deleteRecurringPayment(payment.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={payment ? 'Edit recurring payment' : 'Add recurring payment'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass} mt-1`}
            placeholder="Rent, Netflix, Car EMI, Salary…"
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
          {(['expense', 'income'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setKind(value)
                setCategory((value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0])
              }}
              aria-pressed={kind === value}
              className={`rounded-md py-2 ${kind === value ? 'bg-segment shadow-sm' : 'text-ink-2'}`}
            >
              {value === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>
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
              required
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={`${fieldClass} mt-1`}>
              {categories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Frequency</label>
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}
              className={`${fieldClass} mt-1`}
            >
              {FREQUENCIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Next due date</label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(event) => setNextDueDate(event.target.value)}
              className={`${fieldClass} mt-1`}
              required
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          {payment ? (
            <button type="button" onClick={remove} className="text-xs text-error-ink hover:underline">
              Delete
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
              {payment ? 'Save changes' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
