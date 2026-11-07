'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { mainNav, manageNav, projectNav, workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'

/** Header search across pages, projects and tasks of the current workspace. */
export function SearchBox({ className = '' }: { className?: string }) {
  const { workspace, projects, tasks } = useWorkspace()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // "/" focuses search from anywhere (only the copy that is visible at this width).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      )
        return
      if (!input.current?.offsetParent || document.querySelector('dialog[open]')) return
      event.preventDefault()
      input.current.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const term = query.trim().toLowerCase()
  const results = term
    ? [
        ...[...mainNav(workspace), ...manageNav(workspace)].map((item) => ({
          ...item,
          kind: 'Page',
        })),
        ...projectNav(workspace, projects).map((item) => ({ ...item, kind: 'Project' })),
        ...tasks.map((task) => ({
          label: task.title,
          href: workspacePath(workspace.key, 'tasks'),
          kind: task.code,
        })),
      ]
        .filter((item) => item.label.toLowerCase().includes(term))
        .slice(0, 8)
    : []

  const go = (href: string) => {
    router.push(href)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        size={15}
      />
      <input
        ref={input}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) go(results[0].href)
          if (event.key === 'Escape') {
            setOpen(false)
            event.currentTarget.blur()
          }
        }}
        className="h-10 w-full rounded-lg border border-line-strong bg-field pl-9 pr-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder="Search…"
        aria-label="Search pages, projects and tasks"
        aria-keyshortcuts="/"
      />
      {!query && (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong px-1.5 font-sans text-2xs text-ink-3 md:block">
          /
        </kbd>
      )}
      {open && term && (
        <div className="neo-popover absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl py-1">
          {results.length ? (
            results.map((item) => (
              <button
                type="button"
                key={`${item.kind}-${item.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(item.href)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-ui hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-2xs text-ink-3">{item.kind}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-ui text-ink-3">No matches</p>
          )}
        </div>
      )}
    </div>
  )
}
