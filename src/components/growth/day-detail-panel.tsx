'use client'

import { Info } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/meetings'
import { useWorkspace } from '@/state/workbench-store'

/** Read-only summary of one day: which habits were logged, and reading/focus sessions. */
export function DayDetailPanel({ date }: { date: string }) {
  const { habits, habitEntries, readingSessions, focusSessions } = useWorkspace()
  const entries = habitEntries.filter((entry) => entry.date === date)
  const reading = readingSessions.filter((session) => session.date === date)
  const focus = focusSessions.filter((session) => session.date === date)
  const label = new Date(date).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <h3 className="font-semibold text-ink">{label}</h3>
      {!entries.length && !reading.length && !focus.length ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-3">
          <Info size={14} /> Nothing logged on this day.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {entries.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Habits</p>
              <ul className="mt-1.5 space-y-1">
                {entries.map((entry) => {
                  const habit = habits.find((item) => item.id === entry.habitId)
                  if (!habit) return null
                  return (
                    <li key={entry.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`size-2 shrink-0 rounded-full ${CATEGORY_COLORS[habit.color].dot}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">{habit.title}</span>
                      <span className="shrink-0 text-xs text-ink-2 capitalize">{entry.status}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {reading.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Reading</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {reading.map((session) => (
                  <li key={session.id}>
                    {session.pagesRead ? `${session.pagesRead} pages` : 'Session logged'}
                    {session.durationMinutes ? ` · ${session.durationMinutes}m` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {focus.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Focus</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {focus.map((session) => (
                  <li key={session.id}>
                    {session.durationMinutes}m · concentration {session.concentrationRating}/5
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
