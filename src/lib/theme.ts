'use client'

import { useEffect, useState } from 'react'

import { THEME_COLORS, THEME_KEY, type ResolvedTheme } from './theme-config'

export { THEME_COLORS, THEME_KEY, THEME_SCRIPT, type ResolvedTheme } from './theme-config'

/** Light, dark, or follow the device. Stored per browser; applied as `html.dark`. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Fired on window whenever any component changes the theme, so every picker stays in sync. */
const CHANGE_EVENT = 'workbench-theme-change'

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Storage blocked: follow the device.
  }
  return 'system'
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Points every theme-color meta tag (mobile browser chrome) at the active theme. */
function syncThemeColor(theme: ResolvedTheme) {
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', THEME_COLORS[theme]))
}

function apply(preference: ThemePreference, animate: boolean): ResolvedTheme {
  const theme = resolve(preference)
  const root = document.documentElement
  if (animate) {
    // Fade colors instead of snapping when the user switches.
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 320)
  }
  root.classList.toggle('dark', theme === 'dark')
  syncThemeColor(theme)
  return theme
}

/**
 * The saved preference, the theme actually showing, and `choose` to change it. Any number
 * of components may use this; a change in one (or in another tab) updates them all.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [resolved, setResolved] = useState<ResolvedTheme>('light')

  useEffect(() => {
    const sync = () => {
      const saved = readPreference()
      setPreference(saved)
      setResolved(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    }
    sync()
    syncThemeColor(resolve(readPreference()))

    // Follow the device's setting live while on "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onDeviceChange = () => {
      if (readPreference() !== 'system') return
      apply('system', true)
      window.dispatchEvent(new Event(CHANGE_EVENT))
    }
    // Another tab changed the theme: apply it here too.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return
      apply(readPreference(), true)
      sync()
    }
    media.addEventListener('change', onDeviceChange)
    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      media.removeEventListener('change', onDeviceChange)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  const choose = (next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage blocked: the choice still applies until the page reloads.
    }
    setPreference(next)
    setResolved(apply(next, true))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  /** Flips between light and dark, saving an explicit choice. */
  const toggle = () => choose(resolved === 'dark' ? 'light' : 'dark')

  return { preference, resolved, choose, toggle }
}
