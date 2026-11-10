'use client'

import { Receipt } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { useWorkspace } from '@/state/workbench-store'
import { TransactionRow } from './transaction-row'

const RECENT_LIMIT = 5

/** The last few transactions, read-only — full editing lives on the Transactions tab. */
export function RecentTransactions({ onViewAll }: { onViewAll: () => void }) {
  const { ready, expenses } = useWorkspace()
  // Already ordered most-recent-first by the store's query.
  const recent = expenses.slice(0, RECENT_LIMIT)

  return (
    <section className="neo-card overflow-hidden rounded-xl">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="text-sm font-semibold">Recent transactions</p>
        <button type="button" onClick={onViewAll} className="text-xs font-semibold text-primary-ink hover:underline">
          View all →
        </button>
      </div>
      {!ready && <p className="px-4 py-8 text-center text-sm text-ink-3">Loading…</p>}
      {ready && !recent.length && <EmptyState icon={Receipt} title="Nothing recorded yet" />}
      <div className="divide-y divide-line-soft px-4">
        {recent.map((record) => (
          <TransactionRow key={record.id} record={record} />
        ))}
      </div>
    </section>
  )
}
