'use client'

import { Lightbulb } from 'lucide-react'
import { ColumnChart, Legend, SERIES, StatTile } from '@/components/charts/charts'
import { PanelHeader } from '@/components/ui/panel'
import { financeInsights, shiftMonthKey, summarizeMonth } from '@/lib/finance'
import { money } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

const MONTHS_SHOWN = 6

/** Compact numbers computed only from real transactions, plus the longer trend chart. */
export function FinanceInsightsPanel({ month }: { month: string }) {
  const { expenses, settings } = useWorkspace()
  const insights = financeInsights(expenses, month)
  const format = (value: number) => money(value, settings.currency)

  const months = Array.from({ length: MONTHS_SHOWN }, (_, index) => {
    const key = shiftMonthKey(month, index - (MONTHS_SHOWN - 1))
    const summary = summarizeMonth(expenses, key)
    const start = new Date(`${key}-01T12:00`)
    return {
      label: start.toLocaleDateString([], { month: 'short' }),
      detail: start.toLocaleDateString([], { month: 'long', year: 'numeric' }),
      values: [summary.income, summary.expenses],
    }
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Savings rate" value={insights.savingsRate === null ? '—' : `${insights.savingsRate}%`} />
        <StatTile
          label="Highest category"
          value={insights.highestCategory ? insights.highestCategory.category : '—'}
          note={insights.highestCategory ? format(insights.highestCategory.amount) : undefined}
        />
        <StatTile label="Avg daily spend" value={format(insights.avgDailySpend)} />
        <StatTile
          label="Vs last month"
          value={insights.vsLastMonthPct === null ? '—' : `${insights.vsLastMonthPct > 0 ? '+' : ''}${insights.vsLastMonthPct}%`}
          note={
            insights.vsLastMonthPct === null
              ? undefined
              : insights.vsLastMonthPct > 0
                ? 'spending more'
                : insights.vsLastMonthPct < 0
                  ? 'spending less'
                  : undefined
          }
        />
      </div>
      <section className="neo-card min-w-0 rounded-xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <PanelHeader
            icon={Lightbulb}
            title="Income vs expenses"
            subtitle={`Last ${MONTHS_SHOWN} months in ${settings.currency}`}
          />
          <Legend series={[{ name: 'Income', color: SERIES[0] }, { name: 'Expenses', color: SERIES[1] }]} />
        </div>
        <ColumnChart
          data={months}
          series={[{ name: 'Income', color: SERIES[0] }, { name: 'Expenses', color: SERIES[1] }]}
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
    </div>
  )
}
