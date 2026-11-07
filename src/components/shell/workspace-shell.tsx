'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, ViewTransition, type ReactNode } from 'react'
import { NewTaskDialog } from '@/components/tasks/new-task-dialog'
import { greetingParts } from '@/lib/format'
import { pageSubtitle, pageTitle, workspacePath } from '@/lib/routes'
import { useToast, useWorkspace } from '@/state/workbench-store'
import { NotificationCenter } from './notification-center'
import { SearchBox } from './search-box'
import { Sidebar } from './sidebar'
import { ThemeToggle } from './theme-controls'
import { UserMenu } from './user-menu'
import { WorkspaceSwitcher } from './workspace-switcher'

const COLLAPSED_KEY = 'aayama-sidebar-collapsed'

/** True when a key press is meant for a text field, so single-key shortcuts must ignore it. */
function typing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Sidebar, header and toast wrapped around every `/[space]/*` page. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { workspace, projects, profile, error, reload } = useWorkspace()
  const { toast } = useToast()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop only: the sidebar shrinks to an icon rail. Remembered per browser.
  const [collapsed, setCollapsed] = useState(false)
  const [creating, setCreating] = useState(false)
  // Computed after mount: pages are prerendered, so the server cannot know today's date.
  const [greeting, setGreeting] = useState<ReturnType<typeof greetingParts> | null>(null)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
    } catch {
      // Storage blocked: start expanded.
    }
  }, [])

  const toggleCollapsed = () =>
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, current ? '0' : '1')
      } catch {
        // Storage blocked: the choice lasts until reload.
      }
      return !current
    })

  useEffect(() => {
    setGreeting(greetingParts())
    // Keeps the clock in the subtitle current.
    const interval = window.setInterval(() => setGreeting(greetingParts()), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  // N opens "New task" from anywhere, unless typing or another dialog is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return
      if (typing(event.target) || document.querySelector('dialog[open]')) return
      event.preventDefault()
      setCreating(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const home = pathname === workspacePath(workspace.key)
  const firstName = profile?.fullName?.trim().split(/\s+/)[0]
  const title = home
    ? greeting
      ? `${greeting.salutation}${firstName ? `, ${firstName}` : ''}`
      : workspace.name
    : pageTitle(workspace, projects, pathname, workspace.name)
  const subtitle = home ? (greeting?.when ?? ' ') : pageSubtitle(workspace, pathname)

  return (
    <div className="workbench-scale flex min-h-screen bg-canvas text-ink">
      <Sidebar
        workspace={workspace}
        projects={projects}
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={toggleCollapsed}
        onNewTask={() => setCreating(true)}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-5 md:px-8 md:pt-7">
          <header className="flex items-center gap-3">
            <button
              type="button"
              className="neo-control grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:text-ink lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <div className="mr-auto min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-[26px] sm:leading-8">
                {title}
              </h1>
              <p className="truncate text-xs text-ink-2 sm:text-ui">{subtitle}</p>
            </div>
            <SearchBox className="hidden w-[220px] md:block xl:w-[260px]" />
            <div className="hidden xl:block">
              <WorkspaceSwitcher active={workspace.key} />
            </div>
            <ThemeToggle />
            <NotificationCenter />
            <UserMenu />
          </header>

          <SearchBox className="mt-3 md:hidden" />

          {error && (
            <div
              className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error-light px-4 py-2.5 text-sm text-error-ink"
              role="alert"
            >
              <span className="mr-auto min-w-0 break-words">Could not load data: {error}</span>
              <button
                type="button"
                onClick={() => void reload()}
                className="rounded-lg border border-error/40 bg-surface px-3 py-1 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/*
           * Keyed by workspace and path, so per-page state resets. Navigations are React
           * transitions: the old page fades out and the new one rises in while the sidebar
           * and header stay put (CSS in globals.css; plain fade where unsupported).
           */}
          <ViewTransition
            key={`${workspace.key}:${pathname}`}
            enter="page-enter"
            exit="page-exit"
            default="none"
          >
            <div className="animate-page">{children}</div>
          </ViewTransition>
        </div>
      </main>
      {creating && <NewTaskDialog onClose={() => setCreating(false)} />}
      {toast && (
        <div
          key={toast}
          className="neo-popover animate-toast fixed bottom-4 right-4 z-[70] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl px-4 py-3 text-ui font-medium text-ink [overflow-wrap:anywhere]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
