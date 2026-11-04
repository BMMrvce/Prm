'use client'

import { Menu, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Fragment, useState, type ReactNode } from 'react'
import { pageTitle } from '@/lib/routes'
import { useToast, useWorkspace } from '@/state/workbench-store'
import { NotificationCenter } from './notification-center'
import { Sidebar } from './sidebar'
import { WorkspaceSwitcher } from './workspace-switcher'

/** Sidebar, header and toast wrapped around every `/[space]/*` page. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace()
  const { toast } = useToast()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)

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
            <h2 className="mr-auto text-[22px] font-semibold tracking-[-0.025em]">
              {pageTitle(workspace, pathname)}
            </h2>
            <label className="relative hidden w-[180px] md:block xl:w-[228px]">
              <input
                className="h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-[14px] outline-none focus:border-[#675ee0]"
                placeholder="Search..."
              />
            </label>
            <WorkspaceSwitcher active={workspace.key} />
            <NotificationCenter />
            <span className="grid size-8 place-items-center rounded-full bg-[#eef0ff] text-[11px] font-semibold text-[#2721a6]">
              ME
            </span>
          </header>

          <div className="mt-2 flex md:hidden">
            <label className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96969c]"
                size={15}
              />
              <input
                className="h-10 w-full rounded-lg border border-[#d8d8dc] bg-white pl-9 pr-3 text-[14px] outline-none"
                placeholder="Search..."
              />
            </label>
          </div>

          {/* Keyed so per-page state (notes, forms, dismissed alert) resets when switching workspace. */}
          <Fragment key={workspace.key}>{children}</Fragment>
        </div>
      </main>
      {toast && (
        <div
          className="neo-card fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl px-4 py-3 text-[13px] font-medium text-[#303038]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
