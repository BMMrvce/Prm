'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StatTile } from '@/components/charts/charts'
import { budgetProgress, monthLabel, monthKey as nowMonthKey, shiftMonthKey, summarizeMonth } from '@/lib/finance'
import { money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { EntryKind } from '@/types/workbench'

export function FinanceOverview({
  month,
  onMonthChange,
  onOpenTransactions,
}: {
  month: string
  onMonthChange: (month: string) => void
  onOpenTransactions: (filter: { kind?: EntryKind | 'all' }) => void
}) {
  const { expenses, budget, settings } = useWorkspace()
  const format = (value: number) => money(value, settings.currency)
  const summary = summarizeMonth(expenses, month)
  const progress = budgetProgress(budget, summary.byCategory, month)
  const isCurrent = month === nowMonthKey()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonthKey(month, -1))}
          className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3"
          aria-label="Previous month"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonthKey(month, 1))}
          disabled={isCurrent}
          className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3 disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight size={17} />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {monthLabel(month)}
        </p>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => onMonthChange(nowMonthKey())}
            className="rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-2 hover:text-ink"
          >
            This month
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button type="button" onClick={() => onOpenTransactions({ kind: 'income' })} className="text-left">
          <StatTile label="Income" value={format(summary.income)} />
        </button>
        <button type="button" onClick={() => onOpenTransactions({ kind: 'expense' })} className="text-left">
          <StatTile label="Expenses" value={format(summary.expenses)} />
        </button>
        <StatTile
          label="Net savings"
          value={`${summary.net < 0 ? '−' : ''}${format(Math.abs(summary.net))}`}
          note={summary.net < 0 ? 'Spent more than earned' : undefined}
        />
        <StatTile
          label="Budget remaining"
          value={progress.overallRemaining === null ? '—' : format(progress.overallRemaining)}
          note={
            progress.overallRemaining !== null && progress.overallRemaining < 0
              ? 'Over budget'
              : progress.dailySafeToSpend !== null
                ? `${format(progress.dailySafeToSpend)}/day safe to spend`
                : 'No overall limit set'
          }
        />
      </div>
    </div>
  )
}
