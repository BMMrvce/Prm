'use client'

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { money } from '@/lib/format'
import type { EntryKind, ExpenseRecord } from '@/types/workbench'

const ICONS: Record<EntryKind, typeof ArrowUpRight> = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
  reimbursement: ArrowUpRight,
}

export function TransactionRow({
  record,
  onEdit,
  onDelete,
}: {
  record: ExpenseRecord
  onEdit?: () => void
  onDelete?: () => void
}) {
  const Icon = ICONS[record.kind]
  const sign = record.kind === 'income' ? '+' : record.kind === 'expense' ? '−' : ''

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 sm:grid-cols-[auto_72px_minmax(0,1fr)_140px_auto_auto]">
      <span
        className={`grid size-7 place-items-center rounded-full ${
          record.kind === 'income' ? 'bg-accent-light text-accent-ink' : 'bg-primary-light text-primary-ink'
        }`}
        aria-hidden
      >
        <Icon size={14} />
      </span>
      <span className="hidden text-xs text-ink-2 sm:block">{record.date}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{record.description}</p>
        <p className="mt-0.5 truncate text-xs text-ink-2 sm:hidden">
          {record.date} · {record.category}
        </p>
        {record.notes && <p className="mt-0.5 truncate text-xs text-ink-3">{record.notes}</p>}
      </div>
      <span className="hidden truncate text-xs text-ink-2 sm:block">
        {record.category}
        {record.paymentMethod ? ` · ${record.paymentMethod}` : ''}
      </span>
      <span className="text-right text-sm font-semibold tabular-nums">
        {sign}
        {money(record.amount, record.currency)}
      </span>
      <div className="flex shrink-0 gap-0.5">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label={`Edit ${record.description}`}
          >
            <Pencil size={13} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="grid size-7 place-items-center rounded-md text-ink-3 hover:text-error-ink"
            aria-label={`Delete ${record.description}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
