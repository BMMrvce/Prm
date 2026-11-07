/**
 * Theme constants shared by the server layout and the client theme hook. No 'use client'
 * here, so server components get the real values rather than client references.
 */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'workbench-theme'

/** Browser chrome color per theme; matches `--background` in globals.css. */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f3f4f8', dark: '#000000' }

/**
 * Runs in <head> before the page paints so dark mode never flashes white. Kept as a
 * string because it must run before React loads.
 */
export const THEME_SCRIPT = `try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`
