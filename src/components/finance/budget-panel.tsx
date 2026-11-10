'use client'

import { Pencil, Wallet } from 'lucide-react'
import { useState } from 'react'
import { PanelHeader } from '@/components/ui/panel'
import { budgetProgress, budgetTone, summarizeMonth } from '@/lib/finance'
import { money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import { BudgetFormModal } from './budget-form-modal'

const TONE_BAR: Record<'ok' | 'warn' | 'over', string> = {
  ok: 'bg-primary',
  warn: 'bg-warning',
  over: 'bg-error',
}

/** Overall + per-category budget progress, with today's safe-to-spend. */
export function BudgetPanel({
  month,
  onSelectCategory,
}: {
  month: string
  onSelectCategory: (category: string) => void
}) {
  const { expenses, budget, settings } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const summary = summarizeMonth(expenses, month)
  const progress = budgetProgress(budget, summary.byCategory, month)
  const format = (value: number) => money(value, settings.currency)
  const hasAnyLimit = progress.overallLimit !== null || progress.perCategory.length > 0

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={Wallet}
        title="Monthly budget"
        subtitle={
          progress.overallLimit !== null
            ? `${format(progress.overallSpent)} of ${format(progress.overallLimit)}`
            : 'No overall limit set'
        }
      >
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
          aria-label="Edit budget"
        >
          <Pencil size={14} />
        </button>
      </PanelHeader>

      {progress.overallLimit !== null && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${TONE_BAR[budgetTone(progress.overallPct)]}`}
              style={{ width: `${Math.min(100, progress.overallPct ?? 0)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-2">
            {progress.overallPct}% used
            {progress.dailySafeToSpend !== null
              ? ` · ${format(progress.dailySafeToSpend)}/day safe to spend`
              : ''}
            {progress.overallRemaining !== null && progress.overallRemaining < 0 && (
              <span className="text-error-ink"> · over by {format(-progress.overallRemaining)}</span>
            )}
          </p>
        </div>
      )}

      {progress.perCategory.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {progress.perCategory.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => onSelectCategory(item.category)}
              className="block w-full text-left"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink">{item.category}</span>
                <span className="text-ink-2">
                  {format(item.spent)} / {format(item.limit)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${TONE_BAR[budgetTone(item.pct)]}`}
                  style={{ width: `${Math.min(100, item.pct ?? 0)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {!hasAnyLimit && (
        <p className="mt-3 text-sm text-ink-3">Set a monthly limit to start tracking your budget.</p>
      )}

      {editing && <BudgetFormModal onClose={() => setEditing(false)} />}
    </section>
  )
}
