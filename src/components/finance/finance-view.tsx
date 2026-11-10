'use client'

import { useState } from 'react'
import { monthKey } from '@/lib/finance'
import { useWorkspace } from '@/state/workbench-store'
import type { EntryKind } from '@/types/workbench'
import { BudgetPanel } from './budget-panel'
import { FinanceMissingMigrationBanner } from './finance-missing-migration-banner'
import { FinanceInsightsPanel } from './finance-insights'
import { FinanceOverview } from './finance-overview'
import { RecentTransactions } from './recent-transactions'
import { RecurringPanel } from './recurring-panel'
import { SavingsGoalsPanel } from './savings-goals-panel'
import { SpendingBreakdown } from './spending-breakdown'
import { TransactionsPanel } from './transactions-panel'

type Tab = 'overview' | 'transactions' | 'recurring' | 'insights'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'insights', label: 'Insights' },
]

/**
 * Personal Finance: an overview (metrics, budget, breakdown, recent transactions, savings)
 * plus Transactions/Recurring/Insights tabs for everything that doesn't need to live on the
 * homepage. All of it reads from the same `expenses`/`budget`/`savingsGoals` state, so a
 * change anywhere (adding a transaction, editing a budget) is reflected everywhere at once.
 */
export function FinanceView() {
  const { ready, financeReady } = useWorkspace()
  const [tab, setTab] = useState<Tab>('overview')
  const [month, setMonth] = useState(() => monthKey())
  const [category, setCategory] = useState<string | null>(null)
  const [kind, setKind] = useState<EntryKind | 'all'>('all')

  const openTransactions = (filter: { category?: string | null; kind?: EntryKind | 'all' }) => {
    if (filter.category !== undefined) setCategory(filter.category)
    if (filter.kind !== undefined) setKind(filter.kind)
    setTab('transactions')
  }

  if (ready && !financeReady) return <FinanceMissingMigrationBanner />

  return (
    <div className="mt-4 space-y-4">
      <div className="flex w-fit rounded-lg bg-surface-2 p-0.5 text-xs font-medium">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`rounded-md px-3 py-1.5 ${tab === item.key ? 'bg-segment shadow-sm' : 'text-ink-2'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <FinanceOverview month={month} onMonthChange={setMonth} onOpenTransactions={openTransactions} />
          <BudgetPanel month={month} onSelectCategory={(value) => openTransactions({ category: value, kind: 'expense' })} />
          <SpendingBreakdown
            month={month}
            onSelectCategory={(value) => openTransactions({ category: value, kind: 'expense' })}
          />
          <RecentTransactions onViewAll={() => setTab('transactions')} />
          <SavingsGoalsPanel />
        </div>
      )}
      {tab === 'transactions' && (
        <TransactionsPanel category={category} kind={kind} onCategoryChange={setCategory} onKindChange={setKind} />
      )}
      {tab === 'recurring' && <RecurringPanel />}
      {tab === 'insights' && <FinanceInsightsPanel month={month} />}
    </div>
  )
}
