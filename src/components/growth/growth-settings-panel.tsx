'use client'

import { Settings2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { CATEGORY_COLORS } from '@/lib/meetings'
import { useWorkspace } from '@/state/workbench-store'
import { MissingMigrationBanner } from './missing-migration-banner'

/** Archived habits keep their history; restoring brings them back into the active list. */
export function GrowthSettingsPanel() {
  const { ready, growthReady, habits, habitEntries, restoreHabit, deleteHabit } = useWorkspace()

  if (ready && !growthReady) return <MissingMigrationBanner />

  const archived = habits.filter((habit) => habit.archivedAt)

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={Settings2}
        title="Archived habits"
        subtitle="Their history is kept; restore any time, or delete once there's nothing logged"
      />
      {ready && !archived.length && <EmptyState icon={Settings2} title="No archived habits" />}
      <div className="mt-3 divide-y divide-line-soft">
        {archived.map((habit) => {
          const hasEntries = habitEntries.some((entry) => entry.habitId === habit.id)
          return (
            <div key={habit.id} className="flex items-center gap-3 py-2.5">
              <span className={`size-2 shrink-0 rounded-full ${CATEGORY_COLORS[habit.color].dot}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{habit.title}</span>
              <button
                type="button"
                onClick={() => void restoreHabit(habit.id)}
                className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2"
              >
                Restore
              </button>
              {!hasEntries && (
                <button
                  type="button"
                  onClick={() => void deleteHabit(habit.id)}
                  className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs text-error-ink hover:bg-error-light"
                >
                  Delete
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
