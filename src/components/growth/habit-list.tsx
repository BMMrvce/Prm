'use client'

import { Archive, BarChart3, ListChecks, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarRows, ColumnChart, StatTile } from '@/components/charts/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { localDate } from '@/lib/format'
import {
  analyticsSummary,
  currentStreak,
  heatmapRange,
  longestStreak,
  todayCompletionRate,
  weekConsistency,
} from '@/lib/habits'
import { useWorkspace } from '@/state/workbench-store'
import type { Habit, HabitCategory } from '@/types/workbench'
import { FocusTimer } from './focus-timer'
import { HabitFormModal } from './habit-form-modal'
import { HabitRow } from './habit-row'
import { HabitWeekGrid } from './habit-week-grid'
import { Heatmap } from './heatmap'
import { MissingMigrationBanner } from './missing-migration-banner'

const CATEGORY_LABELS: Record<HabitCategory, string> = {
  focus: 'Focus & Productivity',
  reading: 'Reading',
  technical: 'Technical Growth',
  health: 'Health',
  financial: 'Financial Discipline',
  other: 'Other',
}

const CATEGORY_ORDER: HabitCategory[] = ['focus', 'reading', 'technical', 'health', 'financial', 'other']

/** Create, edit, archive and delete habits, grouped by category. */
export function HabitList() {
  const { ready, growthReady, habits, habitEntries, logHabitEntry, archiveHabit, deleteHabit } =
    useWorkspace()
  const [editing, setEditing] = useState<Habit | null>(null)
  const [creating, setCreating] = useState(false)
  const active = habits.filter((habit) => !habit.archivedAt)
  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        habits: active.filter((habit) => habit.category === category),
      })).filter((group) => group.habits.length),
    [active],
  )

  if (ready && !growthReady) return <MissingMigrationBanner />

  const now = new Date()
  const todayRate = todayCompletionRate(habits, habitEntries, now)
  const bestStreak = active.reduce((max, habit) => Math.max(max, currentStreak(habit, habitEntries, now)), 0)
  const weekScore = weekConsistency(habits, habitEntries, now)
  const totalCompleted = habitEntries.filter((entry) => entry.status === 'completed').length

  const [monthStart] = (() => {
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    return [start, now] as [Date, Date]
  })()
  const report = analyticsSummary(habits, habitEntries, [monthStart, now])
  const perHabitRates = active
    .map((habit) => ({ habit, rate: analyticsSummary([habit], habitEntries, [monthStart, now]).completionRate ?? 0 }))
    .sort((a, b) => b.rate - a.rate)
  const topStreaks = active
    .map((habit) => ({ habit, streak: longestStreak(habit, habitEntries) }))
    .filter((item) => item.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5)
  const trend = heatmapRange(habits, habitEntries, now, 30)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Today" value={todayRate === null ? '—' : `${todayRate}%`} note="completion" />
        <StatTile label="Best streak" value={String(bestStreak)} note="days in a row" />
        <StatTile label="This week" value={weekScore === null ? '—' : `${weekScore}%`} note="consistency" />
        <StatTile label="Completed" value={String(totalCompleted)} note="all time" />
      </div>

      <FocusTimer />

      <section className="neo-card rounded-xl p-4 sm:p-5">
        <PanelHeader
          icon={ListChecks}
          title="Habits"
          subtitle={`${active.length} active habit${active.length === 1 ? '' : 's'}`}
        >
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-9 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
          >
            Add habit
          </button>
        </PanelHeader>
        {ready && !active.length && (
          <EmptyState icon={ListChecks} title="No habits yet" hint="Add your first habit to start tracking." />
        )}
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{group.label}</h3>
            <div className="mt-1.5 divide-y divide-line-soft">
              {group.habits.map((habit) => {
                const hasEntries = habitEntries.some((entry) => entry.habitId === habit.id)
                return (
                  <div key={habit.id} className="group flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <HabitRow
                        habit={habit}
                        entries={habitEntries}
                        onLog={(status, options) =>
                          void logHabitEntry(habit.id, localDate(), status, options)
                        }
                      />
                    </div>
                    <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditing(habit)}
                        className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                        aria-label={`Edit ${habit.title}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void archiveHabit(habit.id)}
                        className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                        aria-label={`Archive ${habit.title}`}
                      >
                        <Archive size={13} />
                      </button>
                      {!hasEntries && (
                        <button
                          type="button"
                          onClick={() => void deleteHabit(habit.id)}
                          className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-error-light hover:text-error-ink"
                          aria-label={`Delete ${habit.title}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        </div>
        {(creating || editing) && (
          <HabitFormModal
            habit={editing}
            onClose={() => {
              setCreating(false)
              setEditing(null)
            }}
          />
        )}
      </section>

      {active.length > 0 && (
        <section className="neo-card rounded-xl p-4 sm:p-5">
          <PanelHeader icon={ListChecks} title="This week" subtitle="Weekly consistency at a glance" />
          <div className="mt-4">
            <HabitWeekGrid habits={habits} entries={habitEntries} />
          </div>
        </section>
      )}

      <Heatmap />

      {active.length > 0 && (
        <section className="neo-card rounded-xl p-4 sm:p-5">
          <PanelHeader icon={BarChart3} title="Historical report" subtitle="Last 30 days" />
          <div className="mt-4">
            <ColumnChart
              data={trend.map((day) => ({
                label: new Date(day.date).toLocaleDateString([], { day: 'numeric' }),
                detail: new Date(day.date).toLocaleDateString([], {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                }),
                values: [day.rate ?? 0],
              }))}
              series={[{ name: 'Completion', color: 'var(--series-1)' }]}
              format={(value) => `${Math.round(value)}%`}
              labelEvery={3}
            />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">
                Completion by habit · {report.completionRate === null ? '—' : `${report.completionRate}% overall`}
              </p>
              <BarRows
                rows={perHabitRates.map((item) => ({ label: item.habit.title, values: [item.rate] }))}
                series={[{ name: 'Completion', color: 'var(--series-1)' }]}
                format={(value) => `${Math.round(value)}%`}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">Longest streaks</p>
              {topStreaks.length > 0 ? (
                <ul className="space-y-2">
                  {topStreaks.map((item) => (
                    <li key={item.habit.id} className="flex items-center justify-between text-sm">
                      <span className="min-w-0 truncate text-ink">{item.habit.title}</span>
                      <span className="shrink-0 text-ink-2">{item.streak} days</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No streaks yet — keep going.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
