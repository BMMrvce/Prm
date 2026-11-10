import { localDate, weekRange } from '@/lib/format'
import { isDueOn } from '@/lib/habits'
import { CATEGORY_COLORS } from '@/lib/meetings'
import type { Habit, HabitEntry } from '@/types/workbench'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Compact weekly consistency grid: one row per active habit, one cell per day this week. */
export function HabitWeekGrid({ habits, entries }: { habits: Habit[]; entries: HabitEntry[] }) {
  const [weekStart] = weekRange()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date
  })
  const active = habits.filter((habit) => !habit.archivedAt)
  if (!active.length) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-y-1 text-left text-xs">
        <thead>
          <tr className="text-ink-3">
            <th className="w-0 font-normal" />
            {days.map((day) => (
              <th key={day.toISOString()} className="w-8 pb-1 text-center font-normal">
                {DAY_LABELS[day.getDay()]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {active.map((habit) => (
            <tr key={habit.id}>
              <td className="max-w-[160px] truncate pr-2 text-ink-2">{habit.title}</td>
              {days.map((day) => {
                const due = isDueOn(habit, day)
                const date = localDate(day)
                const entry = entries.find((item) => item.habitId === habit.id && item.date === date)
                const className = !due
                  ? ''
                  : entry?.status === 'completed'
                    ? CATEGORY_COLORS[habit.color].dot
                    : entry?.status === 'skipped'
                      ? 'bg-surface-2'
                      : 'border border-line-strong bg-field'
                return (
                  <td key={date} className="text-center">
                    <span
                      className={`mx-auto block size-5 rounded ${className}`}
                      aria-label={`${habit.title} on ${date}: ${due ? (entry?.status ?? 'not done yet') : 'not due'}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
