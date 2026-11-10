'use client'

import { Receipt, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { downloadCsv, toCsv } from '@/lib/csv'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/lib/finance'
import { localDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { EntryKind, ExpenseRecord } from '@/types/workbench'
import { TransactionFormModal } from './transaction-form-modal'
import { TransactionRow } from './transaction-row'

const KIND_OPTIONS: { value: EntryKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]

const MRU_KEY = 'finance-recent-categories'

function loadRecentCategories(): Record<string, string[]> {
  try {
    return JSON.parse(window.localStorage.getItem(MRU_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function pushRecentCategory(kind: string, category: string) {
  try {
    const all = loadRecentCategories()
    all[kind] = [category, ...(all[kind] ?? []).filter((item) => item !== category)].slice(0, 5)
    window.localStorage.setItem(MRU_KEY, JSON.stringify(all))
  } catch {
    // Storage unavailable: recently-used ordering just won't persist.
  }
}

/** Quick entry, search/filter, edit/delete and CSV export — the full transaction manager. */
export function TransactionsPanel({
  category,
  kind,
  onCategoryChange,
  onKindChange,
}: {
  category: string | null
  kind: EntryKind | 'all'
  onCategoryChange: (category: string | null) => void
  onKindChange: (kind: EntryKind | 'all') => void
}) {
  const { ready, expenses, addExpense, deleteExpense } = useWorkspace()
  const [entryKind, setEntryKind] = useState<EntryKind>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [entryCategory, setEntryCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [date, setDate] = useState(() => localDate())
  const [paymentMethod, setPaymentMethod] = useState('')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editing, setEditing] = useState<ExpenseRecord | null>(null)

  const baseCategories = entryKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const orderedCategories = useMemo(() => {
    const recent = (loadRecentCategories()[entryKind] ?? []).filter((item) =>
      (baseCategories as readonly string[]).includes(item),
    )
    return [...recent, ...baseCategories.filter((item) => !recent.includes(item))]
    // `expenses.length` forces a re-read after a submit bumps the recently-used order in storage.
  }, [entryKind, baseCategories, expenses.length])

  const switchEntryKind = (value: EntryKind) => {
    setEntryKind(value)
    setEntryCategory((value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0])
  }

  const submitQuick = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(amount)
    if (!description.trim() || !Number.isFinite(value) || value <= 0) return
    const ok = await addExpense({
      kind: entryKind,
      description: description.trim(),
      category: entryCategory,
      amount: value,
      date: date || undefined,
      paymentMethod: paymentMethod || null,
      notes: note.trim() || null,
    })
    if (ok) {
      pushRecentCategory(entryKind, entryCategory)
      setDescription('')
      setAmount('')
      setNote('')
    }
  }

  const categoryOptions = useMemo(
    () => [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...expenses.map((item) => item.category)])],
    [expenses],
  )

  const filtered = expenses.filter((record) => {
    if (kind !== 'all' && record.kind !== kind) return false
    if (category && record.category !== category) return false
    if (dateFrom && record.date < dateFrom) return false
    if (dateTo && record.date > dateTo) return false
    const query = search.trim().toLowerCase()
    if (query && !record.description.toLowerCase().includes(query) && !record.category.toLowerCase().includes(query)) {
      return false
    }
    return true
  })

  const exportCsv = () => {
    const csv = toCsv(
      ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency', 'Payment method', 'Note'],
      filtered.map((record) => [
        record.date,
        record.kind,
        record.description,
        record.category,
        record.amount.toFixed(2),
        record.currency,
        record.paymentMethod ?? '',
        record.notes ?? '',
      ]),
    )
    downloadCsv('personal-transactions.csv', csv)
  }

  const input =
    'h-10 min-w-0 rounded-lg border border-line-strong bg-field px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="space-y-4">
      <form onSubmit={submitQuick} className="neo-card rounded-xl p-4 sm:p-5">
        <div className="mb-3 grid w-fit grid-cols-3 rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
          {(['expense', 'income', 'transfer'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchEntryKind(value)}
              aria-pressed={entryKind === value}
              className={`rounded-md px-3 py-1.5 ${entryKind === value ? 'bg-segment shadow-sm' : 'text-ink-2'}`}
            >
              {value === 'income' ? 'Income' : value === 'transfer' ? 'Transfer' : 'Expense'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What was this for?"
            className={`${input} min-w-[160px] flex-[2]`}
            maxLength={240}
            aria-label="Description"
            required
          />
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            className={`${input} w-28`}
            aria-label="Amount"
            required
          />
          <select
            value={entryCategory}
            onChange={(event) => setEntryCategory(event.target.value)}
            className={`${input} w-36`}
            aria-label="Category"
          >
            {orderedCategories.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`${input} w-36`}
            aria-label="Date"
            required
          />
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className={`${input} w-32`}
            aria-label="Payment method"
          >
            <option value="">Payment…</option>
            {PAYMENT_METHODS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optional)"
            className={`${input} min-w-[140px] flex-1`}
            maxLength={500}
            aria-label="Note"
          />
          <button
            type="submit"
            disabled={!ready}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions"
            className={`${input} w-full pl-8`}
            aria-label="Search transactions"
          />
        </div>
        <select
          value={kind}
          onChange={(event) => onKindChange(event.target.value as EntryKind | 'all')}
          className={`${input} w-32`}
          aria-label="Filter by type"
        >
          {KIND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={category ?? ''}
          onChange={(event) => onCategoryChange(event.target.value || null)}
          className={`${input} w-40`}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className={`${input} w-36`}
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className={`${input} w-36`}
          aria-label="To date"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-xs font-medium"
        >
          Export CSV
        </button>
      </div>

      <section className="neo-card overflow-hidden rounded-xl">
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">Transactions</p>
          <p className="text-xs text-ink-2">
            {filtered.length} of {expenses.length}
          </p>
        </div>
        {!ready && <p className="px-4 py-8 text-center text-sm text-ink-3">Loading…</p>}
        {ready && !filtered.length && (
          <EmptyState icon={Receipt} title="No transactions match" hint="Try different filters." />
        )}
        <div className="divide-y divide-line-soft px-4">
          {filtered.map((record) => (
            <TransactionRow
              key={record.id}
              record={record}
              onEdit={() => setEditing(record)}
              onDelete={() => {
                if (window.confirm(`Delete “${record.description}”?`)) void deleteExpense(record.id)
              }}
            />
          ))}
        </div>
      </section>

      {editing && <TransactionFormModal record={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
