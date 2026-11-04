'use client'

import { CircleDollarSign, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { ExpenseRecord, SpaceKey } from '@/types/workbench'

const categories: Record<SpaceKey, string[]> = {
  office: ['Travel', 'Meals', 'Equipment', 'Other'],
  studio: ['Software', 'Infrastructure', 'Contractors', 'Marketing'],
  personal: ['Food', 'Transport', 'Home', 'Health', 'Leisure'],
}

const idPrefix: Record<SpaceKey, string> = { office: 'RB', studio: 'EX', personal: 'PE' }

function exportCsv(records: ExpenseRecord[], filename: string) {
  const rows = [
    ['ID', 'Date', 'Description', 'Category', 'Amount', 'Status'],
    ...records.map((record) => [
      record.id,
      record.date,
      record.description,
      record.category,
      record.amount.toFixed(2),
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

export function ExpenseTracker() {
  const { workspace, expenses: records, addExpense } = useWorkspace()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[workspace.key][0])
  const total = records.reduce((sum, record) => sum + record.amount, 0)
  const pending = records
    .filter((record) => record.status === 'Pending')
    .reduce((sum, record) => sum + record.amount, 0)
  const isOffice = workspace.key === 'office'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    addExpense({
      id: `${idPrefix[workspace.key]}-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().slice(0, 10),
      description: description.trim(),
      category,
      amount: parsedAmount,
      status: isOffice ? 'Pending' : 'Recorded',
    })
    setDescription('')
    setAmount('')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="neo-card rounded-xl p-4">
          <p className="text-xs text-[#73737a]">
            {isOffice ? 'Claims this month' : 'Spent this month'}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{money(total)}</p>
        </div>
        <div className="neo-card rounded-xl p-4">
          <p className="text-xs text-[#73737a]">
            {isOffice ? 'Awaiting approval' : 'Average transaction'}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {money(isOffice ? pending : records.length ? total / records.length : 0)}
          </p>
        </div>
        <div className="neo-card rounded-xl p-4">
          <p className="text-xs text-[#73737a]">Entries</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{records.length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="neo-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[#eeedff] text-[#4638ca]">
              <CircleDollarSign size={19} />
            </span>
            <div>
              <h3 className="font-semibold">{isOffice ? 'Log reimbursement' : 'Add expense'}</h3>
              <p className="text-xs text-[#73737a]">
                {isOffice
                  ? 'Submit an amount for approval'
                  : `Track ${workspace.switchLabel.toLowerCase()} spending`}
              </p>
            </div>
          </div>
          <label className="mt-5 block text-xs font-medium text-[#55555c]">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]"
              placeholder={isOffice ? 'Taxi, meal, equipment…' : 'What did you purchase?'}
              required
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#55555c]">
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]"
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
                className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]"
              >
                {categories[workspace.key].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#493bd0] text-sm font-medium text-white hover:bg-[#382bb9]"
            type="submit"
          >
            <Plus size={16} />
            {isOffice ? 'Submit reimbursement' : 'Save expense'}
          </button>
        </form>

        <section className="neo-card overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-[#e4e4e7] px-5 py-4">
            <div>
              <h3 className="font-semibold">
                {isOffice ? 'Reimbursement history' : 'Recent expenses'}
              </h3>
              <p className="text-xs text-[#73737a]">
                Saved on this device and ready for Supabase sync
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportCsv(records, `${workspace.key}-expenses.csv`)}
              className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium"
            >
              Export CSV
            </button>
          </div>
          <div className="divide-y divide-[#eeeeef]">
            {records.map((record) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[90px_1fr_120px_100px_auto]"
                key={record.id}
              >
                <span className="hidden text-xs text-[#77777d] sm:block">{record.date}</span>
                <div>
                  <p className="text-sm font-medium">{record.description}</p>
                  <p className="mt-0.5 text-xs text-[#77777d] sm:hidden">
                    {record.date} · {record.category}
                  </p>
                </div>
                <span className="hidden text-xs text-[#55555c] sm:block">{record.category}</span>
                <span
                  className={`hidden w-fit rounded-full px-2 py-1 text-[10px] font-medium sm:block ${
                    record.status === 'Pending'
                      ? 'bg-[#fff4cf] text-[#8a6100]'
                      : record.status === 'Approved'
                        ? 'bg-[#e6f7ea] text-[#2f7045]'
                        : 'bg-[#eeedff] text-[#3d34aa]'
                  }`}
                >
                  {record.status}
                </span>
                <span className="text-sm font-semibold">{money(record.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
