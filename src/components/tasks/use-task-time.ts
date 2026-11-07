'use client'

import { useEffect, useMemo, useState } from 'react'
import { entrySeconds } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

/**
 * The current time, refreshed every `everyMs`. Starts as null on the server and the first
 * client render, so date-dependent UI never mismatches during hydration.
 */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), everyMs)
    return () => window.clearInterval(interval)
  }, [everyMs])
  return now
}

/**
 * Seconds logged per task by everyone, counting a running timer live (ticks every second
 * only while a timer is running).
 */
export function useTaskTime() {
  const { timeEntries, timer } = useWorkspace()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (timer?.state !== 'running') return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [timer?.state])

  const totals = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of timeEntries) {
      if (entry.taskId)
        map.set(entry.taskId, (map.get(entry.taskId) ?? 0) + entrySeconds(entry, now))
    }
    return map
  }, [timeEntries, now])

  return { secondsFor: (taskId: string) => totals.get(taskId) ?? 0, now }
}
