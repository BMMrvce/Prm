import type { Currency, Priority, TimeEntry } from '@/types/workbench'

export function priorityStyle(priority: Priority) {
  if (priority === 'urgent' || priority === 'high') return 'bg-[#fde8e8] text-[#a52828]'
  if (priority === 'medium') return 'bg-[#fff5cf] text-[#8b5e00]'
  return 'bg-[#e4f8ea] text-[#317a4b]'
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function money(value: number, currency: Currency = 'USD') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

/** `YYYY-MM-DD` in the browser's timezone (for `date` columns such as note_date). */
export function localDate(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Sunday 00:00 of the current week and the Sunday after it, local time. */
export function weekRange(now = new Date()): [Date, Date] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return [start, end]
}

export function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function timeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "Good morning · Thu, 5 Nov · 3:42 PM" for the home header. */
export function greeting(now = new Date()) {
  const hour = now.getHours()
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${part} · ${date} · ${time}`
}

/** `HH:MM:SS` stopwatch text. */
export function stopwatch(totalSeconds: number) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}

export function initials(name: string) {
  const parts = name
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
  return (
    parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2)
  ).toUpperCase()
}

/** Short relative label for a mail timestamp: time today, else day and month. */
export function mailDate(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

/** Seconds recorded on a time entry, counting a running timer up to `now`. */
export function entrySeconds(entry: TimeEntry, now = Date.now()) {
  const running = entry.state === 'running' && !entry.endedAt
  return (
    entry.accumulatedSeconds +
    (running ? Math.max(0, (now - new Date(entry.startedAt).getTime()) / 1000) : 0)
  )
}

/** "2h 15m", "45m" or "0m" for a number of minutes. */
export function duration(totalMinutes: number) {
  const minutes = Math.round(totalMinutes)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
