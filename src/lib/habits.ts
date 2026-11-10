import { localDate, sameDay, weekRange } from '@/lib/format'
import type { FocusSession, Habit, HabitEntry, ReadingSession } from '@/types/workbench'

/** Whether a habit is due on a given local day, per its frequency. */
export function isDueOn(habit: Habit, date: Date) {
  if (habit.frequency === 'weekdays') return (habit.weekdays ?? []).includes(date.getDay())
  // 'daily' habits are due every day; 'weekly' habits can be logged any day
  // of the week toward their target, so both are always "due" day to day.
  return true
}

/** Due-today habits with no entry logged yet for today. */
export function pendingToday(habits: Habit[], entries: HabitEntry[], now = new Date()) {
  const today = localDate(now)
  return habits.filter(
    (habit) =>
      !habit.archivedAt &&
      isDueOn(habit, now) &&
      !entries.some((entry) => entry.habitId === habit.id && entry.date === today),
  )
}

function weeklyStreak(habit: Habit, entries: HabitEntry[], now: Date, longestOnly: boolean) {
  const target = habit.targetPerWeek ?? 1
  const [currentWeekStart] = weekRange(now)
  const habitEntries = entries.filter((entry) => entry.habitId === habit.id)
  const earliestDate = habitEntries.reduce<string | null>(
    (earliest, entry) => (earliest === null || entry.date < earliest ? entry.date : earliest),
    null,
  )
  if (!longestOnly) {
    // Current streak: walk backward week by week; the in-progress week gets
    // grace (it may still hit target before it ends), any fully elapsed week
    // that missed the target stops the count.
    let streak = 0
    let weekStart = currentWeekStart
    for (let i = 0; i < 104; i++) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      if (localDate(weekEnd) <= (earliestDate ?? localDate(weekEnd))) break
      const done = habitEntries.filter(
        (entry) =>
          entry.status === 'completed' && entry.date >= localDate(weekStart) && entry.date < localDate(weekEnd),
      ).length
      const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime()
      if (done >= target) streak++
      else if (!isCurrentWeek) break
      weekStart = new Date(weekStart)
      weekStart.setDate(weekStart.getDate() - 7)
    }
    return streak
  }
  // Longest streak ever: walk forward from the earliest entry.
  if (!earliestDate) return 0
  let longest = 0
  let current = 0
  let weekStart = (() => {
    const [start] = weekRange(new Date(earliestDate))
    return start
  })()
  while (weekStart <= currentWeekStart) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const done = habitEntries.filter(
      (entry) =>
        entry.status === 'completed' && entry.date >= localDate(weekStart) && entry.date < localDate(weekEnd),
    ).length
    if (done >= target) {
      current++
      longest = Math.max(longest, current)
    } else if (weekStart.getTime() !== currentWeekStart.getTime()) {
      current = 0
    }
    weekStart = new Date(weekStart)
    weekStart.setDate(weekStart.getDate() + 7)
  }
  return longest
}

/**
 * Current streak of consecutive due-days completed, walking backward from
 * today. A `skipped` day neither extends nor breaks it (it is simply not
 * counted); a real miss (a due day with no entry at all) stops the count.
 * Today itself gets grace if not yet logged, since the day isn't over.
 */
export function currentStreak(habit: Habit, entries: HabitEntry[], now = new Date()) {
  if (habit.frequency === 'weekly') return weeklyStreak(habit, entries, now, false)
  const habitEntries = entries.filter((entry) => entry.habitId === habit.id)
  let streak = 0
  const cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 400; i++) {
    if (isDueOn(habit, cursor)) {
      const date = localDate(cursor)
      const entry = habitEntries.find((item) => item.date === date)
      if (entry?.status === 'completed') streak++
      else if (entry?.status === 'skipped') {
        // doesn't break, doesn't count
      } else if (!sameDay(cursor, now)) break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Longest streak ever recorded for a habit, over the entries available. */
export function longestStreak(habit: Habit, entries: HabitEntry[]) {
  if (habit.frequency === 'weekly') return weeklyStreak(habit, entries, new Date(), true)
  const habitEntries = entries.filter((entry) => entry.habitId === habit.id)
  if (!habitEntries.length) return 0
  const earliest = habitEntries.reduce((min, entry) => (entry.date < min ? entry.date : min), habitEntries[0].date)
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  let longest = 0
  let current = 0
  const cursor = new Date(earliest)
  while (cursor <= end) {
    if (isDueOn(habit, cursor)) {
      const date = localDate(cursor)
      const entry = habitEntries.find((item) => item.date === date)
      if (entry?.status === 'completed') {
        current++
        longest = Math.max(longest, current)
      } else if (entry?.status !== 'skipped' && !sameDay(cursor, end)) {
        current = 0
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return longest
}

/**
 * Completed-due-days over total-due-days for one week (`skipped` is excluded
 * from both). `null` when nothing was due yet, so "no data" never reads as
 * "0% — failing."
 */
export function weekConsistency(habits: Habit[], entries: HabitEntry[], weekStart: Date) {
  const [start, end] = weekRange(weekStart)
  let due = 0
  let completed = 0
  for (const habit of habits) {
    if (habit.archivedAt) continue
    if (habit.frequency === 'weekly') {
      const target = habit.targetPerWeek ?? 1
      due += target
      const done = entries.filter(
        (entry) =>
          entry.habitId === habit.id &&
          entry.status === 'completed' &&
          entry.date >= localDate(start) &&
          entry.date < localDate(end),
      ).length
      completed += Math.min(done, target)
      continue
    }
    const cursor = new Date(start)
    while (cursor < end) {
      if (isDueOn(habit, cursor)) {
        due++
        const date = localDate(cursor)
        if (entries.some((entry) => entry.habitId === habit.id && entry.date === date && entry.status === 'completed'))
          completed++
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return due === 0 ? null : Math.round((completed / due) * 100)
}

/** Today's completion percentage across today's due, non-archived habits. */
export function todayCompletionRate(habits: Habit[], entries: HabitEntry[], now = new Date()) {
  const today = localDate(now)
  const due = habits.filter((habit) => !habit.archivedAt && isDueOn(habit, now))
  if (!due.length) return null
  const completed = due.filter((habit) =>
    entries.some((entry) => entry.habitId === habit.id && entry.date === today && entry.status === 'completed'),
  ).length
  return Math.round((completed / due.length) * 100)
}

/** 0-4 heatmap intensity bucket for a day's completion rate. */
export function heatmapIntensity(rate: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rate === null || rate <= 0) return 0
  if (rate < 40) return 1
  if (rate < 70) return 2
  if (rate < 100) return 3
  return 4
}

/** One cell per day for the last `days` days, feeding the activity heatmap. */
export function heatmapRange(habits: Habit[], entries: HabitEntry[], now = new Date(), days = 371) {
  const active = habits.filter((habit) => !habit.archivedAt)
  const cells: { date: string; rate: number | null; completed: number; skipped: number; due: number }[] = []
  const cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const date = localDate(cursor)
    const due = active.filter((habit) => isDueOn(habit, cursor)).length
    const dayEntries = entries.filter((entry) => entry.date === date)
    const completed = dayEntries.filter((entry) => entry.status === 'completed').length
    const skipped = dayEntries.filter((entry) => entry.status === 'skipped').length
    cells.push({ date, rate: due === 0 ? null : Math.round((completed / due) * 100), completed, skipped, due })
    cursor.setDate(cursor.getDate() + 1)
  }
  return cells
}

/** Completion rate plus best/worst habit by consistency over an arbitrary range. */
export function analyticsSummary(habits: Habit[], entries: HabitEntry[], range: [Date, Date]) {
  const [start, end] = range
  let totalDue = 0
  let totalCompleted = 0
  const perHabit: { habit: Habit; rate: number }[] = []
  for (const habit of habits.filter((item) => !item.archivedAt)) {
    let due = 0
    let completed = 0
    const cursor = new Date(start)
    while (cursor < end) {
      if (isDueOn(habit, cursor)) {
        due++
        const date = localDate(cursor)
        if (entries.some((entry) => entry.habitId === habit.id && entry.date === date && entry.status === 'completed'))
          completed++
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    totalDue += due
    totalCompleted += completed
    if (due > 0) perHabit.push({ habit, rate: Math.round((completed / due) * 100) })
  }
  perHabit.sort((a, b) => b.rate - a.rate)
  return {
    completionRate: totalDue === 0 ? null : Math.round((totalCompleted / totalDue) * 100),
    best: perHabit[0] ?? null,
    worst: perHabit.length > 1 ? perHabit[perHabit.length - 1] : null,
  }
}

/** Fraction of days in range with at least one reading session logged. */
export function readingConsistency(sessions: ReadingSession[], range: [Date, Date]) {
  const [start, end] = range
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000))
  const daysLogged = new Set(
    sessions
      .filter((session) => {
        const date = new Date(session.date)
        return date >= start && date < end
      })
      .map((session) => session.date),
  ).size
  return Math.round((daysLogged / totalDays) * 100)
}

/** Total deep-work hours, average self-rated concentration, and session count over a range. */
export function focusSummary(sessions: FocusSession[], range: [Date, Date]) {
  const [start, end] = range
  const inRange = sessions.filter((session) => {
    const date = new Date(session.date)
    return date >= start && date < end
  })
  const totalMinutes = inRange.reduce((sum, session) => sum + session.durationMinutes, 0)
  return {
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    avgConcentration: inRange.length
      ? Math.round((inRange.reduce((sum, session) => sum + session.concentrationRating, 0) / inRange.length) * 10) / 10
      : null,
    totalSessions: inRange.length,
  }
}
