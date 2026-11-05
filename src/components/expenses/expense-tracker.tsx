'use client'

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ColumnChart, Legend, SERIES, StatTile } from '@/components/charts/charts'
import { capitalize, localDate, money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { EntryKind, ExpenseRecord, SpaceKey } from '@/types/workbench'

const expenseCategories: Record<SpaceKey, string[]> = {
  office: ['Travel', 'Meals', 'Equipment', 'Other'],
  studio: ['Software', 'Infrastructure', 'Contractors', 'Marketing', 'Other'],
  personal: ['Food', 'Transport', 'Home', 'Health', 'Leisure', 'Other'],
}

const incomeCategories: Record<SpaceKey, string[]> = {
  office: [],
  studio: ['Client work', 'Product sales', 'Retainers', 'Other'],
  personal: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'],
}

const MONTHS_SHOWN = 6

function exportCsv(records: ExpenseRecord[], filename: string) {
  const rows = [
    ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency', 'Status'],
    ...records.map((record) => [
      record.date,
      record.kind,
      record.description,
      record.category,
      record.amount.toFixed(2),
      record.currency,
      record.status,
    ]),
  ]
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Office: reimbursement claims. Studio and Personal: income and expenses. */
export function ExpenseTracker() {
  const {
    workspace,
    ready,
    settings,
    expenses: records,
    addExpense,
    deleteExpense,
  } = useWorkspace()
  const isOffice = workspace.key === 'office'
  const [kind, setKind] = useState<EntryKind>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(expenseCategories[workspace.key][0])
  const [date, setDate] = useState('')
  const [filter, setFilter] = useState<'all' | EntryKind>('all')
  // Month boundaries depend on the viewer's clock, so they are set after mount.
  const [month, setMonth] = useState<string | null>(null)
  /** `YYYY-MM` the summary cards show, or 'all' for every entry. */
  const [viewMonth, setViewMonth] = useState<string | null>(null)
  const picked = useRef(false)

  useEffect(() => {
    setMonth(localDate().slice(0, 7))
    setDate(localDate())
  }, [])

  const showMonth = (next: string | null) => {
    picked.current = true
    setViewMonth(next)
  }
  const shiftMonth = (step: number) => {
    const from = viewMonth && viewMonth !== 'all' ? viewMonth : month
    if (!from) return
    const [year, monthIndex] = from.split('-').map(Number)
    showMonth(localDate(new Date(year, monthIndex - 1 + step, 1)).slice(0, 7))
  }
  const viewLabel =
    viewMonth === 'all'
      ? 'All time'
      : viewMonth
        ? new Date(`${viewMonth}-01T12:00`).toLocaleDateString([], {
            month: 'long',
            year: 'numeric',
          })
        : ''

  const categories =
    kind === 'income' ? incomeCategories[workspace.key] : expenseCategories[workspace.key]
  const format = (value: number) => money(value, settings.currency)
  // Summaries cover entries in the workspace's currency.
  const inCurrency = records.filter((record) => record.currency === settings.currency)
  const otherCurrency = records.length - inCurrency.length
  const thisMonth = inCurrency.filter(
    (record) => viewMonth === 'all' || (viewMonth && record.date.startsWith(viewMonth)),
  )

  // Open on this month, or on the latest month with entries when this month has none yet.
  useEffect(() => {
    if (!month || !ready || picked.current) return
    const latest = inCurrency.reduce((max, record) => (record.date > max ? record.date : max), '')
    const hasThisMonth = inCurrency.some((record) => record.date.startsWith(month))
    setViewMonth(hasThisMonth || !latest ? month : latest.slice(0, 7))
  }, [month, ready, inCurrency])
  const total = (list: ExpenseRecord[], type: EntryKind) =>
    list.filter((record) => record.kind === type).reduce((sum, record) => sum + record.amount, 0)
  const income = total(thisMonth, 'income')
  const spent = total(thisMonth, 'expense')
  const claims = total(thisMonth, 'reimbursement')
  const pending = thisMonth
    .filter((record) => record.status === 'pending')
    .reduce((sum, record) => sum + record.amount, 0)

  const months = month
    ? Array.from({ length: MONTHS_SHOWN }, (_, index) => {
        const [year, monthIndex] = month.split('-').map(Number)
        const start = new Date(year, monthIndex - 1 - (MONTHS_SHOWN - 1 - index), 1)
        const key = localDate(start).slice(0, 7)
        const list = inCurrency.filter((record) => record.date.startsWith(key))
        return {
          key,
          label: start.toLocaleDateString([], { month: 'short' }),
          detail: start.toLocaleDateString([], { month: 'long', year: 'numeric' }),
          values: [total(list, 'income'), total(list, 'expense')],
        }
      })
    : []

  const switchKind = (next: EntryKind) => {
    setKind(next)
    setCategory((next === 'income' ? incomeCategories : expenseCategories)[workspace.key][0])
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    const ok = await addExpense({
      kind: isOffice ? 'reimbursement' : kind,
      description: description.trim(),
      category,
      amount: parsedAmount,
      date: date || undefined,
    })
    if (ok) {
      setDescription('')
      setAmount('')
    }
  }

  const shown = filter === 'all' ? records : records.filter((record) => record.kind === filter)
  const input =
    'mt-2 h-10 w-full rounded-lg border border-line-strong bg-field px-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15'
  const net = income - spent

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3"
          aria-label="Previous month"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!viewMonth || viewMonth === month || viewMonth === 'all'}
          className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3 disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight size={17} />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {viewLabel}
        </p>
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => showMonth(month)}
            aria-pressed={viewMonth === month}
            className={`rounded-md px-2.5 py-1 ${viewMonth === month ? 'bg-surface shadow-sm' : 'text-ink-2'}`}
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => showMonth('all')}
            aria-pressed={viewMonth === 'all'}
            className={`rounded-md px-2.5 py-1 ${viewMonth === 'all' ? 'bg-surface shadow-sm' : 'text-ink-2'}`}
          >
            All time
          </button>
        </div>
        {otherCurrency > 0 && (
          <p className="text-xs text-warning-ink">
            {otherCurrency} {otherCurrency === 1 ? 'entry is' : 'entries are'} in another currency
            and not counted. Change the currency in Settings to see them.
          </p>
        )}
      </div>
      {isOffice ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Claims" value={format(claims)} />
          <StatTile label="Awaiting approval" value={format(pending)} />
          <StatTile label="Entries" value={String(thisMonth.length)} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Income" value={format(income)} />
          <StatTile label="Expenses" value={format(spent)} />
          <StatTile
            label="Net"
            value={`${net < 0 ? '−' : ''}${format(Math.abs(net))}`}
            note={
              net < 0
                ? 'Spending more than earning'
                : net > 0
                  ? 'Earning more than spending'
                  : undefined
            }
          />
        </div>
      )}

      {!isOffice && (
        <section className="neo-card min-w-0 rounded-xl p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">Income vs expenses</h3>
              <p className="text-xs text-ink-2">
                Last {MONTHS_SHOWN} months in {settings.currency} · click a month to see its totals
              </p>
            </div>
            <Legend
              series={[
                { name: 'Income', color: SERIES[0] },
                { name: 'Expenses', color: SERIES[1] },
              ]}
            />
          </div>
          <ColumnChart
            data={months}
            selected={months.findIndex((item) => item.key === viewMonth)}
            onSelect={(index) => showMonth(months[index].key)}
            series={[
              { name: 'Income', color: SERIES[0] },
              { name: 'Expenses', color: SERIES[1] },
            ]}
            format={(value) =>
              new Intl.NumberFormat([], {
                style: 'currency',
                currency: settings.currency,
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(value)
            }
          />
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="neo-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary-light text-primary-ink">
              <CircleDollarSign size={19} />
            </span>
            <div>
              <h3 className="font-semibold">
                {isOffice ? 'Log reimbursement' : kind === 'income' ? 'Add income' : 'Add expense'}
              </h3>
              <p className="text-xs text-ink-2">
                {isOffice
                  ? 'Submit an amount for approval'
                  : `Track ${workspace.switchLabel.toLowerCase()} money in and out`}
              </p>
            </div>
          </div>
          {!isOffice && (
            <div className="mt-5 grid grid-cols-2 rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
              {(['expense', 'income'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => switchKind(value)}
                  aria-pressed={kind === value}
                  className={`rounded-md py-2 ${kind === value ? 'bg-surface shadow-sm' : 'text-ink-2'}`}
                >
                  {value === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
          )}
          <label className="mt-4 block text-xs font-medium text-ink-2">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={input}
              placeholder={
                isOffice
                  ? 'Taxi, meal, equipment…'
                  : kind === 'income'
                    ? 'Invoice, salary, sale…'
                    : 'What did you pay for?'
              }
              maxLength={240}
              required
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink-2">
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={input}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
            </label>
            <label className="block text-xs font-medium text-ink-2">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={input}
              >
                {categories.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-xs font-medium text-ink-2">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={input}
              required
            />
          </label>
          <button
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            type="submit"
            disabled={!ready}
          >
            <Plus size={16} />
            {isOffice ? 'Submit reimbursement' : kind === 'income' ? 'Save income' : 'Save expense'}
          </button>
        </form>

        <section className="neo-card min-w-0 overflow-hidden rounded-xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div className="mr-auto">
              <h3 className="font-semibold">
                {isOffice ? 'Reimbursement history' : 'Transactions'}
              </h3>
              <p className="text-xs text-ink-2">Synced with your workspace</p>
            </div>
            {!isOffice && (
              <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
                {(['all', 'income', 'expense'] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={`rounded-md px-3 py-1.5 ${filter === value ? 'bg-surface shadow-sm' : 'text-ink-2'}`}
                  >
                    {value === 'all' ? 'All' : value === 'income' ? 'Income' : 'Expenses'}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  shown,
                  `${workspace.key}-${isOffice ? 'reimbursements' : 'transactions'}.csv`,
                )
              }
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-medium"
            >
              Export CSV
            </button>
          </div>
          {!ready && <p className="px-5 py-8 text-center text-sm text-ink-3">Loading…</p>}
          {ready && !shown.length && (
            <p className="px-5 py-8 text-center text-sm text-ink-3">
              {isOffice ? 'No reimbursements submitted yet.' : 'Nothing recorded yet.'}
            </p>
          )}
          <div className="divide-y divide-line-soft">
            {shown.map((record) => {
              const isIncome = record.kind === 'income'
              const deletable = record.status === 'recorded' || record.status === 'pending'
              return (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[auto_90px_minmax(0,1fr)_120px_100px_auto_auto]"
                  key={record.id}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full ${isIncome ? 'bg-accent-light text-accent-ink' : 'bg-secondary-light text-secondary'}`}
                    aria-label={isIncome ? 'Income' : 'Expense'}
                  >
                    {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </span>
                  <span className="hidden text-xs text-ink-2 sm:block">{record.date}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.description}</p>
                    <p className="mt-0.5 text-xs text-ink-2 sm:hidden">
                      {record.date} · {record.category}
                    </p>
                  </div>
                  <span className="hidden truncate text-xs text-ink-2 sm:block">
                    {record.category}
                  </span>
                  <span
                    className={`hidden w-fit rounded-full px-2 py-1 text-[10px] font-medium sm:block ${
                      record.status === 'pending'
                        ? 'bg-warning-light text-warning-ink'
                        : record.status === 'approved' || record.status === 'paid'
                          ? 'bg-success-light text-success-ink'
                          : 'bg-primary-light text-primary-ink'
                    }`}
                  >
                    {isOffice ? capitalize(record.status) : isIncome ? 'Income' : 'Expense'}
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums">
                    {isOffice ? '' : isIncome ? '+' : '−'}
                    {money(record.amount, record.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete “${record.description}”?`)) {
                        void deleteExpense(record.id)
                      }
                    }}
                    disabled={!deletable}
                    className="text-ink-3 hover:text-error-ink disabled:invisible"
                    aria-label={`Delete ${record.description}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
