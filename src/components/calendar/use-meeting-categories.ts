'use client'

import { useMemo } from 'react'
import { categoriesEnabled, resolveCategories } from '@/lib/meetings'
import { useWorkspace } from '@/state/workbench-store'

/**
 * This workspace's meeting categories (from Settings, else the defaults), or null where
 * categories are off (Personal).
 */
export function useMeetingCategories() {
  const { workspace, settings } = useWorkspace()
  const enabled = categoriesEnabled(workspace.key)
  const saved = settings.meetingCategories
  return useMemo(() => (enabled ? resolveCategories(saved) : null), [enabled, saved])
}
