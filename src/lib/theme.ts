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

/** Where a theme switch was triggered from (the reveal grows out of this point). */
export type ThemeOrigin = { x: number; y: number }

/**
 * Switches to `preference`. Animated switches use a View Transition: the browser snapshots
 * the page, swaps the theme underneath, and reveals the new one in a circle growing from
 * `origin` (the button pressed), all on the GPU, so nothing repaints piece by piece.
 * Without View Transitions, or with reduced motion, it switches instantly.
 */
function apply(preference: ThemePreference, animate: boolean, origin?: ThemeOrigin): ResolvedTheme {
  const theme = resolve(preference)
  const root = document.documentElement
  const swap = () => {
    root.classList.toggle('dark', theme === 'dark')
    syncThemeColor(theme)
  }
  const changes = root.classList.contains('dark') !== (theme === 'dark')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!animate || !changes || reduced || !('startViewTransition' in document)) {
    swap()
    return theme
  }
  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  // Radius that reaches the farthest corner of the window.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  root.style.setProperty('--theme-x', `${x}px`)
  root.style.setProperty('--theme-y', `${y}px`)
  root.style.setProperty('--theme-r', `${radius}px`)
  root.classList.add('theme-vt')
  const transition = document.startViewTransition(swap)
  void transition.finished.finally(() => root.classList.remove('theme-vt'))
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
    // From the saved choice, not the page's class: during an animated switch the class only
    // changes a moment later, and reading it here would leave every toggle one step behind
    // (the next click would "switch" to the theme already showing).
    const sync = () => {
      const saved = readPreference()
      setPreference(saved)
      setResolved(resolve(saved))
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

  /** Changes the theme; `origin` is the point to reveal the new theme from (a click). */
  const choose = (next: ThemePreference, origin?: ThemeOrigin) => {
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage blocked: the choice still applies until the page reloads.
    }
    setPreference(next)
    setResolved(apply(next, true, origin))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  /** Flips between light and dark, saving an explicit choice. */
  const toggle = (origin?: ThemeOrigin) => choose(resolved === 'dark' ? 'light' : 'dark', origin)

  return { preference, resolved, choose, toggle }
}
