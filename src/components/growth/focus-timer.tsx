'use client'

import { Flame, Play, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PanelHeader } from '@/components/ui/panel'
import { FocusSessionForm } from './focus-session-form'

const STORAGE_KEY = 'growth-focus-timer'
const PRESETS = [25, 45, 60]

type StoredTimer = { startedAt: number; targetMinutes: number }

function loadStored(): StoredTimer | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredTimer>
    if (typeof parsed.startedAt !== 'number' || typeof parsed.targetMinutes !== 'number') return null
    return { startedAt: parsed.startedAt, targetMinutes: parsed.targetMinutes }
  } catch {
    return null
  }
}

function saveStored(value: StoredTimer | null) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the timer just won't survive a refresh.
  }
}

/**
 * Deep-work countdown with 25/45/60-minute presets and a custom duration. The start time and
 * target are persisted (not just a `setInterval` counter), so a refresh — or coming back to the
 * tab later — recomputes remaining time from timestamps instead of losing progress.
 */
export function FocusTimer() {
  const [timer, setTimer] = useState<StoredTimer | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [custom, setCustom] = useState(45)
  const [completing, setCompleting] = useState<{ minutes: number; interrupted: boolean } | null>(null)
  const hydrated = useRef(false)

  // Read any in-progress timer once, on mount, so SSR and the first client render match
  // (avoids a hydration mismatch between "no timer" on the server and a resumed one here).
  useEffect(() => {
    setTimer(loadStored())
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timer])

  const elapsedSeconds = timer ? Math.max(0, Math.floor((now - timer.startedAt) / 1000)) : 0
  const totalSeconds = timer ? timer.targetMinutes * 60 : 0
  const remaining = timer ? Math.max(0, totalSeconds - elapsedSeconds) : 0
  const finished = Boolean(timer) && remaining <= 0

  const start = (minutes: number) => {
    const next = { startedAt: Date.now(), targetMinutes: minutes }
    saveStored(next)
    setTimer(next)
    setNow(Date.now())
  }

  // Handles both outcomes: a natural completion (interrupted=false, logs the full target) and
  // an early manual stop (interrupted=true, logs only the time actually spent).
  const stop = (interrupted: boolean) => {
    if (!timer) return
    const minutes = interrupted ? Math.max(1, Math.round(elapsedSeconds / 60)) : timer.targetMinutes
    saveStored(null)
    setTimer(null)
    setCompleting({ minutes, interrupted })
  }

  if (!hydrated.current) return null

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={Flame}
        title="Focus timer"
        subtitle={timer ? (finished ? 'Session complete' : 'In progress') : 'Start a deep work session'}
      />
      {!timer && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => start(minutes)}
                className="h-10 min-w-[72px] flex-1 rounded-lg border border-line-strong text-sm font-medium text-ink-2 hover:border-primary hover:text-ink"
              >
                {minutes}m
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={custom}
              onChange={(event) => setCustom(Number(event.target.value))}
              className="h-10 w-24 rounded-lg border border-line-strong bg-field px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label="Custom duration in minutes"
            />
            <span className="text-xs text-ink-3">minutes</span>
            <button
              type="button"
              onClick={() => custom > 0 && start(custom)}
              className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
            >
              <Play size={14} /> Start
            </button>
          </div>
        </div>
      )}
      {timer && !finished && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {String(Math.floor(remaining / 60)).padStart(2, '0')}:
            {String(remaining % 60).padStart(2, '0')}
          </p>
          <button
            type="button"
            onClick={() => stop(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-xs font-medium text-ink-2 hover:bg-surface-2"
          >
            <Square size={13} /> Stop
          </button>
        </div>
      )}
      {timer && finished && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink">Nice work — {timer.targetMinutes} minutes done.</p>
          <button
            type="button"
            onClick={() => stop(false)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
          >
            Log it
          </button>
        </div>
      )}
      {completing && (
        <FocusSessionForm
          offerTimeLog
          defaultDurationMinutes={completing.minutes}
          defaultNote={completing.interrupted ? 'Session stopped early.' : null}
          onClose={() => setCompleting(null)}
        />
      )}
    </section>
  )
}
