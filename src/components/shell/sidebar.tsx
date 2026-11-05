'use client'

import {
  CalendarDays,
  CheckSquare,
  Clock3,
  FolderKanban,
  Home,
  Inbox,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Settings,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/logo'
import { initials } from '@/lib/format'
import { mainNav, manageNav, projectNav, type NavIcon, type NavItem } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'
import type { Project, WorkspaceData } from '@/types/workbench'

const ICONS: Record<Exclude<NavIcon, 'project'>, LucideIcon> = {
  home: Home,
  tasks: CheckSquare,
  inbox: Inbox,
  calendar: CalendarDays,
  time: Clock3,
  money: Wallet,
  projects: FolderKanban,
  integrations: Plug,
  settings: Settings,
}

/**
 * Workspace navigation. On phones it slides in as a drawer; on desktop it is either the
 * full sidebar or, when collapsed, a narrow rail of icons (labels shown as tooltips).
 */
export function Sidebar({
  workspace,
  projects,
  open,
  collapsed,
  onClose,
  onToggleCollapsed,
}: {
  workspace: WorkspaceData
  projects: Project[]
  open: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapsed: () => void
}) {
  const pathname = usePathname()
  const { profile, signOut } = useWorkspace()
  const displayName = profile?.fullName || profile?.email || ''
  // The rail only applies on desktop; the mobile drawer always shows labels.
  const rail = collapsed ? 'lg:hidden' : ''

  const navLink = (item: NavItem) => {
    const active = pathname === item.href
    const Icon = item.icon === 'project' ? null : ICONS[item.icon]
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] ${
          collapsed ? 'lg:justify-center lg:px-0' : ''
        } ${
          active
            ? 'bg-nav-active font-medium text-nav-active-text'
            : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
        }`}
      >
        {active && (
          <span
            className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-nav-active-text"
            aria-hidden
          />
        )}
        {Icon ? (
          <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
        ) : (
          <span className="grid size-[17px] shrink-0 place-items-center" aria-hidden>
            <span className="size-2 rounded-[3px]" style={{ background: item.color }} />
          </span>
        )}
        <span className={`truncate ${rail}`}>{item.label}</span>
      </Link>
    )
  }

  const sectionLabel = (label: string) => (
    <p
      className={`mb-1 mt-6 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 ${
        collapsed ? 'lg:sr-only' : ''
      }`}
    >
      {label}
    </p>
  )

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-40 animate-[fade-in_200ms_ease-out] bg-black/30 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-y-auto border-r border-line bg-sidebar px-3 pb-3 pt-5 transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          collapsed ? 'lg:w-[68px] lg:px-2.5' : ''
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`mb-6 flex h-8 items-center justify-between px-1.5 ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <span className={rail}>
            <Logo className="h-[24px]" />
          </span>
          {collapsed && (
            /* eslint-disable-next-line @next/next/no-img-element -- static brand icon */
            <img
              src="/brand/icon-48.png"
              alt="ಆyaama"
              className="hidden size-8 rounded-lg lg:block"
            />
          )}
          <button
            className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 ${collapsed ? 'lg:hidden' : ''}`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            {workspace.switchLabel} workspace
          </p>
          <p className="truncate text-[14px] font-semibold text-ink">{workspace.name}</p>
        </div>

        <nav className="space-y-0.5" aria-label="Workspace navigation">
          {mainNav(workspace).map(navLink)}
        </nav>
        {sectionLabel('Projects')}
        <nav className="space-y-0.5" aria-label="Projects">
          {projectNav(workspace, projects).map(navLink)}
          {!projects.length && (
            <p className={`px-2.5 py-1.5 text-[13px] text-ink-3 ${rail}`}>No projects yet</p>
          )}
        </nav>
        {sectionLabel('Manage')}
        <nav className="space-y-0.5" aria-label="Management">
          {manageNav(workspace).map(navLink)}
        </nav>

        <div className="mt-auto space-y-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink lg:flex ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className={rail}>Collapse</span>
          </button>
          <div
            className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 ${
              collapsed ? 'lg:flex-col lg:px-0' : ''
            }`}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-light text-[11px] font-semibold text-primary-ink"
              title={collapsed ? displayName : undefined}
            >
              {displayName ? initials(displayName) : ''}
            </span>
            <div className={`min-w-0 flex-1 ${rail}`}>
              <p className="truncate text-[13px] font-medium text-ink">{displayName}</p>
              <p className="truncate text-[11px] text-ink-3">{profile?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-error-light hover:text-error-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
