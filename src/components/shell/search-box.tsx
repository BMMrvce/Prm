'use client'

import { Search } from 'lucide-react'

/**
 * The header's search field: opens the command palette (also Alt+S, Ctrl/⌘+K or /), which
 * searches tasks, notes, meetings, projects, pages and mail.
 */
export function SearchBox({ className = '', onOpen }: { className?: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-keyshortcuts="Alt+S Control+K /"
      className={`group flex h-10 w-full items-center gap-2 rounded-lg border border-line-strong bg-field pl-3 pr-2 text-left text-sm text-ink-3 hover:border-primary/50 hover:text-ink-2 ${className}`}
    >
      <Search size={15} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">Search everything…</span>
      <kbd className="hidden shrink-0 rounded border border-line-strong px-1.5 font-sans text-2xs text-ink-3 md:inline">
        Alt S
      </kbd>
    </button>
  )
}
