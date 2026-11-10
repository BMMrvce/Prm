'use client'

import { CalendarRange } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PanelHeader } from '@/components/ui/panel'
import { localDate } from '@/lib/format'
import { heatmapIntensity, heatmapRange } from '@/lib/habits'
import { useWorkspace } from '@/state/workbench-store'
import { DayDetailPanel } from './day-detail-panel'
import { MissingMigrationBanner } from './missing-migration-banner'

type Cell = ReturnType<typeof heatmapRange>[number]

/** 0 (nothing due / no activity) through 4 (fully completed), using the success token only. */
const INTENSITY_CLASSES = ['bg-surface-2', 'bg-success-light', 'bg-success/40', 'bg-success/70', 'bg-success']

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/** GitHub-style activity heatmap: green intensity is the day's habit completion rate. */
export function Heatmap() {
  const { ready, growthReady, habits, habitEntries } = useWorkspace()
  const [selected, setSelected] = useState<string | null>(null)
  const cells = heatmapRange(habits, habitEntries, new Date(), 371)
  // Group into weeks (columns), Sunday-first, so it reads left-to-right like GitHub's graph.
  const weeks = useMemo(() => {
    const columns: Cell[][] = []
    let current: Cell[] = []
    for (const cell of cells) {
      const day = new Date(cell.date).getDay()
      if (day === 0 && current.length) {
        columns.push(current)
        current = []
      }
      current.push(cell)
    }
    if (current.length) columns.push(current)
    return columns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, habitEntries])

  if (ready && !growthReady) return <MissingMigrationBanner />

  const today = localDate()
  const activeDate = selected ?? today
  const selectedCell = cells.find((cell) => cell.date === activeDate) ?? null

  return (
    <div className="space-y-5">
      <section className="neo-card overflow-x-auto rounded-xl p-4 sm:p-5">
        <PanelHeader icon={CalendarRange} title="Activity" subtitle="Last 12 months of habit completion" />
        <div className="mt-4 flex gap-[3px]">
          <div className="flex shrink-0 flex-col gap-[3px] pt-4 pr-1 text-2xs text-ink-3">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index} className="h-[11px] leading-[11px]">
                {label}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelected(cell.date)}
                  className={`size-[11px] rounded-[2px] outline-none ring-ink-3 focus-visible:ring-2 ${
                    INTENSITY_CLASSES[heatmapIntensity(cell.rate)]
                  } ${cell.date === activeDate ? 'ring-2' : ''}`}
                  title={`${new Date(cell.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}${
                    cell.rate === null ? '' : ` · ${cell.rate}%`
                  }`}
                  aria-label={`${cell.date}, ${cell.rate === null ? 'nothing due' : `${cell.rate}% complete`}`}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
      {selectedCell && <DayDetailPanel date={selectedCell.date} />}
    </div>
  )
}
