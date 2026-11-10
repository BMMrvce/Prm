'use client'

import { CalendarClock, CheckCircle2, Pencil } from 'lucide-react'
import { useState } from 'react'
import { StatTile } from '@/components/charts/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { monthlyCommitments } from '@/lib/finance'
import { localDate, money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { RecurringPayment } from '@/types/workbench'
import { RecurringFormModal } from './recurring-form-modal'

function dueLabel(dateStr: string) {
  const today = localDate()
  if (dateStr < today) return { text: 'Overdue', tone: 'text-error-ink' }
  if (dateStr === today) return { text: 'Due today', tone: 'text-warning-ink' }
  return {
    text: new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' }),
    tone: 'text-ink-2',
  }
}

function RecurringRow({ item }: { item: RecurringPayment }) {
  const { settings, markRecurringPaymentPaid } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const due = dueLabel(item.nextDueDate)

  const markPaid = () => {
    if (window.confirm(`Mark “${item.name}” as paid for ${money(item.amount, settings.currency)}?`)) {
      void markRecurringPaymentPaid(item.id)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{item.name}</p>
        <p className={`text-xs ${due.tone}`}>
          {due.text} · {item.frequency}
          {item.category ? ` · ${item.category}` : ''}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {item.kind === 'income' ? '+' : '−'}
        {money(item.amount, settings.currency)}
      </span>
      <button
        type="button"
        onClick={markPaid}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink-2 hover:text-ink"
      >
        <CheckCircle2 size={13} /> Mark paid
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="grid size-8 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label={`Edit ${item.name}`}
      >
        <Pencil size={13} />
      </button>
      {editing && <RecurringFormModal payment={item} onClose={() => setEditing(false)} />}
    </div>
  )
}

/** Upcoming subscriptions, rent, EMIs, bills and regular income. Never auto-posts a transaction. */
export function RecurringPanel() {
  const { recurringPayments, settings } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const active = [...recurringPayments]
    .filter((item) => item.active)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
  const { expenseMonthly, incomeMonthly } = monthlyCommitments(recurringPayments)
  const format = (value: number) => money(value, settings.currency)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Monthly commitments" value={format(expenseMonthly)} note="bills & subscriptions" />
        <StatTile label="Recurring income" value={format(incomeMonthly)} />
      </div>
      <section className="neo-card rounded-xl p-4 sm:p-5">
        <PanelHeader icon={CalendarClock} title="Recurring payments" subtitle={`${active.length} active`}>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-9 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
          >
            Add
          </button>
        </PanelHeader>
        {!active.length && (
          <EmptyState
            icon={CalendarClock}
            title="No recurring payments yet"
            hint="Add subscriptions, rent, EMIs, bills or regular income."
          />
        )}
        <div className="mt-2 divide-y divide-line-soft">
          {active.map((item) => (
            <RecurringRow key={item.id} item={item} />
          ))}
        </div>
        {creating && <RecurringFormModal payment={null} onClose={() => setCreating(false)} />}
      </section>
    </div>
  )
}
