'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/lib/theme'

const OPTIONS: [ThemePreference, string, typeof Sun][] = [
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
  ['system', 'System', Monitor],
]

/** One-click light/dark switch for the header. */
export function ThemeToggle() {
  const theme = useTheme()
  const next = theme.resolved === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={theme.toggle}
      className="neo-control grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:text-ink"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {/* Both icons render; CSS shows the right one so there is no flash before hydration. */}
      <Moon size={17} className="dark:hidden" aria-hidden />
      <Sun size={17} className="hidden dark:block" aria-hidden />
    </button>
  )
}

/** Light / Dark / System choice as a segmented radio group (account menu, settings). */
export function ThemePicker({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const theme = useTheme()
  const md = size === 'md'
  return (
    <div
      className={`grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface-2 p-1 ${md ? 'max-w-sm' : ''}`}
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map(([value, label, Icon]) => {
        const selected = theme.preference === value
        return (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={selected}
            onClick={() => theme.choose(value)}
            className={`flex items-center justify-center gap-1.5 rounded-md ${
              md ? 'h-9 text-ui' : 'flex-col gap-1 py-1.5 text-2xs'
            } ${selected ? 'bg-segment font-medium text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
          >
            <Icon size={md ? 15 : 14} className={selected ? 'text-primary-ink' : ''} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
