'use client'

import { useEffect, useState } from 'react'

/** Light, dark, or follow the device. Stored per browser; applied as `html.dark`. */
export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_KEY = 'workbench-theme'

/**
 * Runs in <head> before the page paints so dark mode never flashes white. Kept as a
 * string because it must run before React loads.
 */
export const THEME_SCRIPT = `try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`

function apply(preference: ThemePreference, animate: boolean) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  if (animate) {
    // Fade colors instead of snapping when the user switches.
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 320)
  }
  root.classList.toggle('dark', dark)
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system')

  useEffect(() => {
    let saved: ThemePreference = 'system'
    try {
      saved = (localStorage.getItem(THEME_KEY) as ThemePreference) || 'system'
    } catch {
      // Storage blocked: follow the device.
    }
    setPreference(saved)
    // Follow the device's setting live while on "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      let current: ThemePreference = 'system'
      try {
        current = (localStorage.getItem(THEME_KEY) as ThemePreference) || 'system'
      } catch {}
      if (current === 'system') apply('system', true)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const choose = (next: ThemePreference) => {
    setPreference(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage blocked: the choice still applies until the page reloads.
    }
    apply(next, true)
  }

  return { preference, choose }
}
