'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { greeting } from '@/lib/format'
import { pageTitle } from '@/lib/routes'
import { useToast, useWorkspace } from '@/state/workbench-store'
import { NotificationCenter } from './notification-center'
import { SearchBox } from './search-box'
import { Sidebar } from './sidebar'
import { UserMenu } from './user-menu'
import { WorkspaceSwitcher } from './workspace-switcher'

/** Sidebar, header and toast wrapped around every `/[space]/*` page. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { workspace, projects, error, reload } = useWorkspace()
  const { toast } = useToast()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)
  // Computed after mount: pages are prerendered, so the server cannot know today's date.
  const [homeTitle, setHomeTitle] = useState('')

  useEffect(() => {
    setHomeTitle(greeting())
    // Keeps the clock in the greeting current.
    const interval = window.setInterval(() => setHomeTitle(greeting()), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopSidebarVisible((visible) => !visible)
    } else {
      setSidebarOpen((visible) => !visible)
    }
  }

  return (
    <div className="workbench-scale flex min-h-screen bg-[#f7f7f8] text-[#17171a]">
      <Sidebar
        workspace={workspace}
        projects={projects}
        open={sidebarOpen}
        desktopVisible={desktopSidebarVisible}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-none px-4 py-5 md:px-8">
          <header className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="neo-control grid size-9 place-items-center rounded-lg text-[#4d4d55]"
              onClick={toggleSidebar}
              aria-label={desktopSidebarVisible ? 'Hide navigation' : 'Show navigation'}
            >
              <Menu size={18} />
            </button>
            <h2 className="mr-auto min-w-0 truncate text-[20px] font-semibold tracking-[-0.025em] sm:text-[22px]">
              {pageTitle(workspace, projects, pathname, homeTitle || workspace.name)}
            </h2>
            <SearchBox className="hidden w-[200px] md:block xl:w-[240px]" />
            <WorkspaceSwitcher active={workspace.key} />
            <NotificationCenter />
            <UserMenu />
          </header>

          <SearchBox className="mt-2 md:hidden" />

          {error && (
            <div
              className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#f3c2c2] bg-[#fdf0f0] px-4 py-2.5 text-sm text-[#a52828]"
              role="alert"
            >
              <span className="mr-auto min-w-0 break-words">Could not load data: {error}</span>
              <button
                type="button"
                onClick={() => void reload()}
                className="rounded-lg border border-[#e7b3b3] bg-white px-3 py-1 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Keyed so per-page state (notes, forms, dismissed alert) resets when switching workspace. */}
          <Fragment key={workspace.key}>{children}</Fragment>
        </div>
      </main>
      {toast && (
        <div
          className="neo-card fixed bottom-4 right-4 z-[70] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl px-4 py-3 text-[13px] font-medium text-[#303038] [overflow-wrap:anywhere]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
