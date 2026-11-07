'use client'

import { CalendarDays, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MailQuery } from '@/lib/mail/types'

export type MailRange = 'any' | 'today' | '7d' | '30d' | 'custom'

export type MailFilterState = {
  search: string
  range: MailRange
  /** Custom range, local `YYYY-MM-DD`, inclusive. */
  from: string
  to: string
}

export const EMPTY_MAIL_FILTERS: MailFilterState = { search: '', range: 'any', from: '', to: '' }

const RANGES: [MailRange, string][] = [
  ['any', 'Any time'],
  ['today', 'Today'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['custom', 'Custom range'],
]

/** Local midnight `days` from today, as an ISO instant. */
function startOfDay(days = 0) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

/** The query the mail API expects; dates become exact instants in the viewer's timezone. */
export function toMailQuery(filters: MailFilterState): MailQuery {
  const query: MailQuery = {}
  const search = filters.search.trim()
  if (search) query.search = search
  if (filters.range === 'today') query.after = startOfDay(0)
  if (filters.range === '7d') query.after = startOfDay(-6)
  if (filters.range === '30d') query.after = startOfDay(-29)
  if (filters.range === 'custom') {
    if (filters.from) query.after = new Date(`${filters.from}T00:00`).toISOString()
    if (filters.to) {
      const end = new Date(`${filters.to}T00:00`)
      end.setDate(end.getDate() + 1)
      query.before = end.toISOString()
    }
  }
  return query
}

export const filtersActive = (filters: MailFilterState) =>
  Boolean(filters.search.trim()) || filters.range !== 'any'

/**
 * Search box plus a date range (presets or a custom from–to). Typing is debounced so the
 * mailbox is searched once you pause, not on every key.
 */
export function MailFilters({
  value,
  onChange,
  compact = false,
}: {
  value: MailFilterState
  onChange: (next: MailFilterState) => void
  compact?: boolean
}) {
  const [text, setText] = useState(value.search)

  // Keep the box in step when filters are cleared from outside.
  useEffect(() => setText(value.search), [value.search])
  useEffect(() => {
    if (text === value.search) return
    const timer = window.setTimeout(() => onChange({ ...value, search: text }), 450)
    return () => window.clearTimeout(timer)
  }, [text, value, onChange])

  const field =
    'h-8 min-w-0 rounded-lg border border-line-strong bg-field text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onChange({ ...value, search: text })
            }}
            className={`${field} w-full pl-8 pr-7`}
            placeholder="Search mail"
            aria-label="Search mail"
            type="search"
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText('')
                onChange({ ...value, search: '' })
              }}
              className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-ink-3 hover:text-ink"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <label className="relative flex shrink-0 items-center">
          <CalendarDays
            size={13}
            className="pointer-events-none absolute left-2.5 text-ink-3"
            aria-hidden
          />
          <select
            value={value.range}
            onChange={(event) => onChange({ ...value, range: event.target.value as MailRange })}
            className={`${field} pl-7 pr-2 ${value.range !== 'any' ? 'border-primary/50 text-primary-ink' : ''}`}
            aria-label="Date range"
          >
            {RANGES.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {value.range === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
          <input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className={`${field} px-2`}
            aria-label="From date"
          />
          <span>to</span>
          <input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className={`${field} px-2`}
            aria-label="To date"
          />
        </div>
      )}
    </div>
  )
}
