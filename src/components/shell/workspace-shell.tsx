'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { greeting } from '@/lib/format'
import { pageTitle } from '@/lib/routes'
import { useToast, useWorkspace } from '@/state/workbench-store'
import { NotificationCenter } from './notification-center'
import { SearchBox } from './search-box'
import { Sidebar } from './sidebar'
import { UserMenu } from './user-menu'
import { WorkspaceSwitcher } from './workspace-switcher'

const COLLAPSED_KEY = 'aayama-sidebar-collapsed'

/** Sidebar, header and toast wrapped around every `/[space]/*` page. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { workspace, projects, error, reload } = useWorkspace()
  const { toast } = useToast()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop only: the sidebar shrinks to an icon rail. Remembered per browser.
  const [collapsed, setCollapsed] = useState(false)
  // Computed after mount: pages are prerendered, so the server cannot know today's date.
  const [homeTitle, setHomeTitle] = useState('')

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
    setHomeTitle(greeting())
    // Keeps the clock in the greeting current.
    const interval = window.setInterval(() => setHomeTitle(greeting()), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  const title = pageTitle(workspace, projects, pathname, homeTitle || workspace.name)

  return (
    <div className="workbench-scale flex min-h-screen bg-canvas text-ink">
      <Sidebar
        workspace={workspace}
        projects={projects}
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 md:px-8 md:py-6">
          <header className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <button
              type="button"
              className="neo-control grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:text-ink lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <h2 className="mr-auto min-w-0 flex-1 truncate text-[20px] font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">
              {title === homeTitle && homeTitle.includes(' · ') ? (
                <>
                  {/* Phones show just the greeting; the date and time follow from sm up. */}
                  {homeTitle.slice(0, homeTitle.indexOf(' · '))}
                  <span className="hidden sm:inline">
                    {homeTitle.slice(homeTitle.indexOf(' · '))}
                  </span>
                </>
              ) : (
                title
              )}
            </h2>
            <SearchBox className="hidden w-[220px] md:block xl:w-[260px]" />
            {/* Full width on its own row on phones, inline from tablet up. */}
            <div className="order-last w-full sm:order-none sm:w-auto">
              <WorkspaceSwitcher active={workspace.key} />
            </div>
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

          {/* Keyed by workspace and path: per-page state resets and each page fades in. */}
          <div key={`${workspace.key}:${pathname}`} className="animate-page">
            {children}
          </div>
        </div>
      </main>
      {toast && (
        <div
          key={toast}
          className="neo-card animate-toast fixed bottom-4 right-4 z-[70] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl px-4 py-3 text-[13px] font-medium text-ink [overflow-wrap:anywhere]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
