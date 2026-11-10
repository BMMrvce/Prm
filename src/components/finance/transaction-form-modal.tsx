'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/lib/finance'
import { useWorkspace } from '@/state/workbench-store'
import type { EntryKind, ExpenseRecord } from '@/types/workbench'

const KINDS: { value: EntryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]

/** Edits (or deletes) an existing transaction. */
export function TransactionFormModal({ record, onClose }: { record: ExpenseRecord; onClose: () => void }) {
  const { updateExpense, deleteExpense } = useWorkspace()
  const [kind, setKind] = useState<EntryKind>(record.kind === 'reimbursement' ? 'expense' : record.kind)
  const [description, setDescription] = useState(record.description)
  const [amount, setAmount] = useState(String(record.amount))
  const [category, setCategory] = useState(record.category)
  const [date, setDate] = useState(record.date)
  const [paymentMethod, setPaymentMethod] = useState(record.paymentMethod ?? '')
  const [notes, setNotes] = useState(record.notes ?? '')
  const [saving, setSaving] = useState(false)
  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(amount)
    if (!description.trim() || !Number.isFinite(value) || value <= 0) return
    setSaving(true)
    const ok = await updateExpense(record.id, {
      kind,
      description: description.trim(),
      category,
      amount: value,
      date,
      paymentMethod: paymentMethod || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const remove = async () => {
    setSaving(true)
    const ok = await deleteExpense(record.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title="Edit transaction" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
          {KINDS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setKind(item.value)
                if (item.value !== kind) {
                  setCategory((item.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0])
                }
              }}
              aria-pressed={kind === item.value}
              className={`rounded-md py-2 ${kind === item.value ? 'bg-segment shadow-sm' : 'text-ink-2'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={240}
            required
          />
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
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} mt-1`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Payment method (optional)</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={`${fieldClass} mt-1`}
            >
              <option value="">—</option>
              {PAYMENT_METHODS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Note (optional)</label>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={500}
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <button type="button" onClick={remove} className="text-xs text-error-ink hover:underline">
            Delete
          </button>
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
              Save changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
