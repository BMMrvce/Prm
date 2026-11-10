'use client'

import { Flame } from 'lucide-react'
import { useState } from 'react'
import { localDate } from '@/lib/format'
import { currentStreak } from '@/lib/habits'
import { CATEGORY_COLORS } from '@/lib/meetings'
import type { Habit, HabitEntry, HabitEntryStatus } from '@/types/workbench'
import { ThreeStateToggle } from './three-state-toggle'

/** One habit's row for today: category dot, title, streak, and the completion toggle. */
export function HabitRow({
  habit,
  entries,
  onLog,
}: {
  habit: Habit
  entries: HabitEntry[]
  onLog: (status: HabitEntryStatus, options?: { note?: string; quantityValue?: number }) => void
}) {
  const today = localDate()
  const todays = entries.find((entry) => entry.habitId === habit.id && entry.date === today)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const needsValue = habit.targetKind !== 'boolean'
  const streak = currentStreak(habit, entries)
  const colors = CATEGORY_COLORS[habit.color]

  const requestComplete = () => {
    if (needsValue && todays?.status !== 'completed') {
      setExpanded(true)
      return
    }
    onLog('completed')
  }

  const confirmValue = () => {
    const value = Number(draft)
    onLog('completed', { quantityValue: Number.isFinite(value) && value > 0 ? value : undefined })
    setExpanded(false)
    setDraft('')
  }

  const target =
    habit.targetKind !== 'boolean' && habit.targetValue
      ? `${habit.targetValue} ${habit.targetUnit ?? ''}`.trim()
      : habit.frequency === 'weekly' && habit.targetPerWeek
        ? `${habit.targetPerWeek}× / week`
        : null

  return (
    <div className="animate-row rounded-lg px-1.5 py-2 hover:bg-surface-2">
      <div className="flex items-center gap-3">
        <span className={`size-2 shrink-0 rounded-full ${colors.dot}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm ${todays?.status === 'completed' ? 'text-ink-3 line-through' : 'text-ink'}`}
          >
            {habit.title}
          </p>
          {(target || streak > 0) && (
            <p className="flex items-center gap-1.5 text-2xs text-ink-3">
              {target}
              {streak > 0 && (
                <span className="flex items-center gap-0.5 text-warning-ink">
                  <Flame size={11} /> {streak}
                </span>
              )}
            </p>
          )}
        </div>
        <ThreeStateToggle
          status={todays?.status ?? null}
          onSet={(status) => (status === 'completed' ? requestComplete() : onLog(status))}
        />
      </div>
      {expanded && (
        <div className="mt-2 flex items-center gap-2 pl-5">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && confirmValue()}
            type="number"
            min={0}
            placeholder={habit.targetValue ? String(habit.targetValue) : '0'}
            className="h-8 w-24 rounded-lg border border-line-strong bg-field px-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-2xs text-ink-3">{habit.targetUnit}</span>
          <button type="button" onClick={confirmValue} className="text-xs font-medium text-primary-ink">
            Save
          </button>
          <button type="button" onClick={() => setExpanded(false)} className="text-xs text-ink-3">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
