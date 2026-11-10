'use client'

import { PieChart } from 'lucide-react'
import { BarRows } from '@/components/charts/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { summarizeMonth } from '@/lib/finance'
import { money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

/** This month's spending by category. Clicking a row filters Transactions to it. */
export function SpendingBreakdown({
  month,
  onSelectCategory,
}: {
  month: string
  onSelectCategory: (category: string) => void
}) {
  const { expenses, settings } = useWorkspace()
  const summary = summarizeMonth(expenses, month)
  const rows = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])
  const format = (value: number) => money(value, settings.currency)

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader icon={PieChart} title="Spending breakdown" />
      {!rows.length && <EmptyState icon={PieChart} title="Nothing spent this month" />}
      {rows.length > 0 && (
        <div className="mt-3">
          <BarRows
            rows={rows.map(([category, amount]) => ({ label: category, values: [amount] }))}
            series={[{ name: 'Spent', color: 'var(--series-1)' }]}
            format={format}
            onSelect={(index) => onSelectCategory(rows[index][0])}
          />
        </div>
      )}
    </section>
  )
}
