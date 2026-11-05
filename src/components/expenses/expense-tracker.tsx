'use client'

import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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

  useEffect(() => {
    setMonth(localDate().slice(0, 7))
    setDate(localDate())
  }, [])

  const categories =
    kind === 'income' ? incomeCategories[workspace.key] : expenseCategories[workspace.key]
  const format = (value: number) => money(value, settings.currency)
  // Summaries cover entries in the workspace's currency.
  const inCurrency = records.filter((record) => record.currency === settings.currency)
  const thisMonth = inCurrency.filter((record) => month && record.date.startsWith(month))
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
    'mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]'
  const net = income - spent

  return (
    <div className="space-y-4">
      {isOffice ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Claims this month" value={format(claims)} />
          <StatTile label="Awaiting approval" value={format(pending)} />
          <StatTile label="Entries this month" value={String(thisMonth.length)} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Income this month" value={format(income)} />
          <StatTile label="Expenses this month" value={format(spent)} />
          <StatTile
            label="Net this month"
            value={`${net < 0 ? '−' : ''}${format(Math.abs(net))}`}
            note={net < 0 ? 'Spending more than earning' : 'Earning more than spending'}
          />
        </div>
      )}

      {!isOffice && (
        <section className="neo-card min-w-0 rounded-xl p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">Income vs expenses</h3>
              <p className="text-xs text-[#73737a]">
                Last {MONTHS_SHOWN} months in {settings.currency}
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
            <span className="grid size-9 place-items-center rounded-lg bg-[#eeedff] text-[#4638ca]">
              <CircleDollarSign size={19} />
            </span>
            <div>
              <h3 className="font-semibold">
                {isOffice ? 'Log reimbursement' : kind === 'income' ? 'Add income' : 'Add expense'}
              </h3>
              <p className="text-xs text-[#73737a]">
                {isOffice
                  ? 'Submit an amount for approval'
                  : `Track ${workspace.switchLabel.toLowerCase()} money in and out`}
              </p>
            </div>
          </div>
          {!isOffice && (
            <div className="mt-5 grid grid-cols-2 rounded-lg bg-[#f2f2f4] p-0.5 text-xs font-medium">
              {(['expense', 'income'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => switchKind(value)}
                  aria-pressed={kind === value}
                  className={`rounded-md py-2 ${kind === value ? 'bg-white shadow-sm' : 'text-[#66666c]'}`}
                >
                  {value === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
          )}
          <label className="mt-4 block text-xs font-medium text-[#55555c]">
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
            <label className="block text-xs font-medium text-[#55555c]">
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
            <label className="block text-xs font-medium text-[#55555c]">
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
          <label className="mt-4 block text-xs font-medium text-[#55555c]">
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
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#493bd0] text-sm font-medium text-white hover:bg-[#382bb9] disabled:opacity-60"
            type="submit"
            disabled={!ready}
          >
            <Plus size={16} />
            {isOffice ? 'Submit reimbursement' : kind === 'income' ? 'Save income' : 'Save expense'}
          </button>
        </form>

        <section className="neo-card min-w-0 overflow-hidden rounded-xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e4e4e7] px-5 py-4">
            <div className="mr-auto">
              <h3 className="font-semibold">
                {isOffice ? 'Reimbursement history' : 'Transactions'}
              </h3>
              <p className="text-xs text-[#73737a]">Synced with your workspace</p>
            </div>
            {!isOffice && (
              <div className="flex rounded-lg bg-[#f2f2f4] p-0.5 text-xs font-medium">
                {(['all', 'income', 'expense'] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={`rounded-md px-3 py-1.5 ${filter === value ? 'bg-white shadow-sm' : 'text-[#66666c]'}`}
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
              className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium"
            >
              Export CSV
            </button>
          </div>
          {!ready && <p className="px-5 py-8 text-center text-sm text-[#88888e]">Loading…</p>}
          {ready && !shown.length && (
            <p className="px-5 py-8 text-center text-sm text-[#88888e]">
              {isOffice ? 'No reimbursements submitted yet.' : 'Nothing recorded yet.'}
            </p>
          )}
          <div className="divide-y divide-[#eeeeef]">
            {shown.map((record) => {
              const isIncome = record.kind === 'income'
              const deletable = record.status === 'recorded' || record.status === 'pending'
              return (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[auto_90px_minmax(0,1fr)_120px_100px_auto_auto]"
                  key={record.id}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full ${isIncome ? 'bg-[#e8f1fc] text-[#1c5cab]' : 'bg-[#fdeee7] text-[#b4461b]'}`}
                    aria-label={isIncome ? 'Income' : 'Expense'}
                  >
                    {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </span>
                  <span className="hidden text-xs text-[#77777d] sm:block">{record.date}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.description}</p>
                    <p className="mt-0.5 text-xs text-[#77777d] sm:hidden">
                      {record.date} · {record.category}
                    </p>
                  </div>
                  <span className="hidden truncate text-xs text-[#55555c] sm:block">
                    {record.category}
                  </span>
                  <span
                    className={`hidden w-fit rounded-full px-2 py-1 text-[10px] font-medium sm:block ${
                      record.status === 'pending'
                        ? 'bg-[#fff4cf] text-[#8a6100]'
                        : record.status === 'approved' || record.status === 'paid'
                          ? 'bg-[#e6f7ea] text-[#2f7045]'
                          : 'bg-[#eeedff] text-[#3d34aa]'
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
                    className="text-[#99999f] hover:text-[#a52828] disabled:invisible"
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
