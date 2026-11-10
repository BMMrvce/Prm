'use client'

import { BookOpen, ListChecks } from 'lucide-react'
import Link from 'next/link'
import { PanelHeader } from '@/components/ui/panel'
import { localDate } from '@/lib/format'
import { workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'
import { TaskList } from './task-list'

/** Simple inline stat for the daily-progress strip: no card, no icon, just a number and a label. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <p className="text-sm text-ink-2">
      <span className="font-semibold text-ink">{value}</span> {label}
    </p>
  )
}

/** The current book only: title, author, progress, and a way to pick it back up. */
function ReadingWidget() {
  const { books, readingSessions } = useWorkspace()
  const book = books.find((item) => item.status === 'reading')

  if (!book) {
    return (
      <Link
        href={workspacePath('personal', 'reading')}
        className="text-xs font-medium text-primary-ink hover:underline"
      >
        + Add a book
      </Link>
    )
  }

  const pagesRead = readingSessions
    .filter((session) => session.bookId === book.id)
    .reduce((sum, session) => sum + (session.pagesRead ?? 0), 0)
  const progress = book.totalPages ? Math.min(100, Math.round((pagesRead / book.totalPages) * 100)) : null

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader icon={BookOpen} title="Reading" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{book.title}</p>
          <p className="truncate text-xs text-ink-2">
            {book.author}
            {progress !== null ? ` · ${progress}%` : pagesRead ? ` · ${pagesRead} pages` : ''}
          </p>
        </div>
        <Link
          href={workspacePath('personal', 'reading')}
          className="shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-primary hover:text-ink"
        >
          Continue reading
        </Link>
      </div>
    </section>
  )
}

/**
 * The redesigned Personal Home: a daily-progress strip, today's priorities and the current
 * book — nothing else. The greeting itself lives in the page header (`WorkspaceShell`), so it
 * isn't repeated here.
 */
export function PersonalHomeView() {
  const { habits, habitEntries, readingSessions, focusSessions } = useWorkspace()
  const today = localDate()

  const habitsCompletedToday = habitEntries.filter(
    (entry) => entry.date === today && entry.status === 'completed',
  ).length
  const activeHabitCount = habits.filter((habit) => !habit.archivedAt).length
  const readingMinutesToday = readingSessions
    .filter((session) => session.date === today)
    .reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0)
  const focusMinutesToday = focusSessions
    .filter((session) => session.date === today)
    .reduce((sum, session) => sum + session.durationMinutes, 0)

  return (
    <div className="mt-4 space-y-5">
      {/* Daily progress: compact inline stats, no cards */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <Stat value={`${habitsCompletedToday}/${activeHabitCount}`} label="habits done" />
        <Stat value={`${readingMinutesToday}m`} label="reading today" />
        <Stat value={`${focusMinutesToday}m`} label="focus today" />
      </div>

      {/* Today's priorities: up to 3 tasks, inline add, simple checkboxes */}
      <section className="neo-card rounded-xl p-4 sm:p-5">
        <PanelHeader icon={ListChecks} title="Today's priorities" />
        <div className="mt-1">
          <TaskList bare fixedView="today" limit={3} />
        </div>
      </section>

      <ReadingWidget />
    </div>
  )
}
