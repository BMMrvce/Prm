'use client'

import { Pencil, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { goalProgress } from '@/lib/finance'
import { money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { ContributionDirection, SavingsGoal } from '@/types/workbench'
import { ContributionFormModal } from './contribution-form-modal'
import { SavingsGoalFormModal } from './savings-goal-form-modal'

function GoalRow({ goal }: { goal: SavingsGoal }) {
  const { savingsContributions, settings } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [contributing, setContributing] = useState<ContributionDirection | null>(null)
  const { current, pct } = goalProgress(goal, savingsContributions)
  const format = (value: number) => money(value, settings.currency)

  return (
    <div className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-ink">{goal.name}</p>
          <span className="shrink-0 text-xs text-ink-2">
            {format(current)} / {format(goal.targetAmount)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {goal.targetDate && (
          <p className="mt-1 text-2xs text-ink-3">
            Target{' '}
            {new Date(goal.targetDate).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setContributing('withdrawal')}
        className="h-8 shrink-0 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink-2 hover:text-ink"
      >
        Withdraw
      </button>
      <button
        type="button"
        onClick={() => setContributing('contribution')}
        className="h-8 shrink-0 rounded-lg bg-primary px-2.5 text-xs font-medium text-on-primary hover:bg-primary-hover"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="grid size-8 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label={`Edit ${goal.name}`}
      >
        <Pencil size={13} />
      </button>
      {editing && <SavingsGoalFormModal goal={goal} onClose={() => setEditing(false)} />}
      {contributing && (
        <ContributionFormModal goal={goal} direction={contributing} onClose={() => setContributing(null)} />
      )}
    </div>
  )
}

/** Compact progress rows per goal — no oversized per-goal cards. */
export function SavingsGoalsPanel() {
  const { savingsGoals } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const active = savingsGoals.filter((goal) => !goal.archivedAt)

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={PiggyBank}
        title="Savings goals"
        subtitle={`${active.length} goal${active.length === 1 ? '' : 's'}`}
      >
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
        >
          Add goal
        </button>
      </PanelHeader>
      {!active.length && (
        <EmptyState icon={PiggyBank} title="No savings goals yet" hint="Add one to start tracking progress." />
      )}
      <div className="mt-2 divide-y divide-line-soft">
        {active.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </div>
      {creating && <SavingsGoalFormModal goal={null} onClose={() => setCreating(false)} />}
    </section>
  )
}
