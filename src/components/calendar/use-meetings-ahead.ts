'use client'

import { useEffect, useRef } from 'react'
import { weekRange } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

/**
 * Makes sure this week's and the next few weeks' meetings are loaded (meetings load a week
 * at a time; already-loaded weeks are skipped by the store).
 */
export function useMeetingsAhead(weeks = 4) {
  const { ready, loadWeek } = useWorkspace()
  const loadWeekRef = useRef(loadWeek)
  useEffect(() => {
    loadWeekRef.current = loadWeek
  })
  useEffect(() => {
    if (!ready) return
    const start = weekRange()[0]
    for (let week = 0; week < weeks; week++) {
      const day = new Date(start)
      day.setDate(start.getDate() + week * 7)
      void loadWeekRef.current(day)
    }
  }, [ready, weeks])
}
