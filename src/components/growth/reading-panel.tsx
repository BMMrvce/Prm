'use client'

import { BarChart3, BookOpen, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { ColumnChart, StatTile } from '@/components/charts/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { localDate, weekRange } from '@/lib/format'
import { readingConsistency } from '@/lib/habits'
import { useWorkspace } from '@/state/workbench-store'
import type { Book, BookStatus } from '@/types/workbench'
import { BookFormModal } from './book-form-modal'
import { MissingMigrationBanner } from './missing-migration-banner'
import { ReadingSessionForm } from './reading-session-form'

const STATUS_LABELS: Record<BookStatus, string> = {
  reading: 'Currently reading',
  planned: 'Planned',
  completed: 'Completed',
}
const STATUS_ORDER: BookStatus[] = ['reading', 'planned', 'completed']

export function ReadingPanel() {
  const { ready, growthReady, books, readingSessions, updateBook } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [loggingFor, setLoggingFor] = useState<Book | null>(null)

  if (ready && !growthReady) return <MissingMigrationBanner />

  const [weekStart, weekEnd] = weekRange()
  const consistency = readingConsistency(readingSessions, [weekStart, weekEnd])
  const sessionsOf = (bookId: string) => readingSessions.filter((session) => session.bookId === bookId)

  const now = new Date()
  const trendDays = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (29 - index))
    return localDate(date)
  })
  const trend = trendDays.map((date) => ({
    label: new Date(date).toLocaleDateString([], { day: 'numeric' }),
    detail: new Date(date).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' }),
    values: [readingSessions.filter((session) => session.date === date).reduce((sum, s) => sum + (s.pagesRead ?? 0), 0)],
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Books" value={String(books.length)} note="in your list" />
        <StatTile
          label="Reading"
          value={String(books.filter((book) => book.status === 'reading').length)}
          note="in progress"
        />
        <StatTile label="This week" value={`${consistency}%`} note="days with a session" />
      </div>

      <section className="neo-card rounded-xl p-4 sm:p-5">
        <PanelHeader
          icon={BookOpen}
          title="Reading"
          subtitle={`${books.length} book${books.length === 1 ? '' : 's'}`}
        >
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
          >
            <Plus size={14} /> Add book
          </button>
        </PanelHeader>
        {ready && !books.length && (
          <EmptyState icon={BookOpen} title="No books yet" hint="Add a book to start tracking your reading." />
        )}
        <div className="mt-4 space-y-5">
          {STATUS_ORDER.map((status) => {
            const list = books.filter((book) => book.status === status)
            if (!list.length) return null
            return (
              <div key={status}>
                <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
                  {STATUS_LABELS[status]}
                </h3>
                <div className="mt-1.5 divide-y divide-line-soft">
                  {list.map((book) => {
                    const sessions = sessionsOf(book.id)
                    const pagesRead = sessions.reduce((sum, session) => sum + (session.pagesRead ?? 0), 0)
                    const recentDays = 7
                    const since = localDate(new Date(now.getTime() - recentDays * 86_400_000))
                    const recentPages = sessions
                      .filter((session) => session.date >= since)
                      .reduce((sum, session) => sum + (session.pagesRead ?? 0), 0)
                    const pace = Math.round((recentPages / recentDays) * 10) / 10
                    return (
                      <div key={book.id} className="group py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line-strong bg-surface-2">
                            {book.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external cover URLs
                              <img src={book.coverUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <BookOpen size={16} className="text-ink-3" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">{book.title}</p>
                            <p className="truncate text-2xs text-ink-3">
                              {book.author}
                              {book.category ? ` · ${book.category}` : ''}
                              {book.totalPages
                                ? ` · ${pagesRead}/${book.totalPages} pages`
                                : pagesRead
                                  ? ` · ${pagesRead} pages`
                                  : ''}
                              {book.pagesPerDayGoal ? ` · ${pace} pages/day (goal ${book.pagesPerDayGoal})` : ''}
                            </p>
                            {book.rating && (
                              <div className="mt-0.5 flex gap-0.5" aria-label={`Rated ${book.rating} out of 5`}>
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <Star
                                    key={value}
                                    size={11}
                                    className={value <= book.rating! ? 'fill-warning-ink text-warning-ink' : 'text-ink-3'}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <select
                            value={book.status}
                            onChange={(event) =>
                              void updateBook(book.id, { status: event.target.value as BookStatus })
                            }
                            className="h-8 shrink-0 rounded-lg border border-line-strong bg-field px-2 text-xs"
                          >
                            <option value="planned">Planned</option>
                            <option value="reading">Reading</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setLoggingFor(book)}
                            className="h-8 shrink-0 rounded-lg border border-line-strong px-2.5 text-xs text-ink-2 hover:bg-surface-2"
                          >
                            Log session
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(book)}
                            className="shrink-0 text-xs text-ink-3 hover:text-ink"
                          >
                            Edit
                          </button>
                        </div>
                        {sessions.length > 0 && (
                          <ul className="mt-2 space-y-1 pl-14">
                            {sessions
                              .slice()
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .slice(0, 3)
                              .map((session) => (
                                <li key={session.id} className="text-2xs text-ink-3">
                                  {new Date(session.date).toLocaleDateString([], {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                  {session.chapter ? ` · ${session.chapter}` : ''}
                                  {session.pagesRead ? ` · ${session.pagesRead} pages` : ''}
                                  {session.durationMinutes ? ` · ${session.durationMinutes}m` : ''}
                                  {session.takeaway ? ` — "${session.takeaway}"` : ''}
                                </li>
                              ))}
                          </ul>
                        )}
                        {(book.learned || book.interesting || book.apply || book.action) && (
                          <dl className="mt-2 grid gap-1.5 pl-14 text-2xs sm:grid-cols-2">
                            {book.learned && (
                              <div>
                                <dt className="text-ink-3">Learned</dt>
                                <dd className="text-ink-2">{book.learned}</dd>
                              </div>
                            )}
                            {book.interesting && (
                              <div>
                                <dt className="text-ink-3">Interesting</dt>
                                <dd className="text-ink-2">{book.interesting}</dd>
                              </div>
                            )}
                            {book.apply && (
                              <div>
                                <dt className="text-ink-3">Apply</dt>
                                <dd className="text-ink-2">{book.apply}</dd>
                              </div>
                            )}
                            {book.action && (
                              <div>
                                <dt className="text-ink-3">Action</dt>
                                <dd className="text-ink-2">{book.action}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {readingSessions.length > 0 && (
        <section className="neo-card rounded-xl p-4 sm:p-5">
          <PanelHeader icon={BarChart3} title="Reading analytics" subtitle="Pages read, last 30 days" />
          <div className="mt-4">
            <ColumnChart
              data={trend}
              series={[{ name: 'Pages', color: 'var(--series-1)' }]}
              format={(value) => `${Math.round(value)} pages`}
              labelEvery={3}
            />
          </div>
        </section>
      )}

      {(creating || editing) && (
        <BookFormModal
          book={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
      {loggingFor && <ReadingSessionForm book={loggingFor} onClose={() => setLoggingFor(null)} />}
    </div>
  )
}
