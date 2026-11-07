'use client'

import {
  CalendarDays,
  Check,
  CheckSquare,
  ChevronsUpDown,
  Clock3,
  FolderKanban,
  Home,
  Inbox,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Plus,
  Settings,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Logo } from '@/components/brand/logo'
import { ProjectBadge } from '@/components/projects/project-color'
import { LinkPending } from '@/components/ui/link-pending'
import { SPACE_KEYS, spaces } from '@/data/workspaces'
import { initials } from '@/lib/format'
import {
  mainNav,
  manageNav,
  projectNav,
  projectPath,
  workspacePath,
  type NavIcon,
  type NavItem,
} from '@/lib/routes'
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
  onNewTask,
}: {
  workspace: WorkspaceData
  projects: Project[]
  open: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapsed: () => void
  onNewTask: () => void
}) {
  const pathname = usePathname()
  const { profile, tasks, signOut } = useWorkspace()
  const displayName = profile?.fullName || profile?.email || ''
  // The rail only applies on desktop; the mobile drawer always shows labels.
  const rail = collapsed ? 'lg:hidden' : ''

  // Open-task counts shown beside My Tasks and each project.
  const openTasks = tasks.filter((task) => task.state === 'open')
  const counts = new Map<string, number>([
    [workspacePath(workspace.key, 'tasks'), openTasks.length],
  ])
  for (const project of projects) {
    counts.set(
      projectPath(workspace.key, project),
      openTasks.filter((task) => task.projectId === project.id).length,
    )
  }

  const navLink = (item: NavItem) => {
    const active = pathname === item.href
    const Icon = item.icon === 'project' ? null : ICONS[item.icon]
    const count = counts.get(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm ${
          collapsed ? 'lg:justify-center lg:px-0' : ''
        } ${
          active
            ? 'bg-nav-active font-medium text-nav-active-text'
            : 'text-sidebar-ink hover:bg-nav-hover hover:text-ink'
        }`}
      >
        {active && (
          <span
            className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-nav-active-bar"
            aria-hidden
          />
        )}
        {Icon ? (
          <Icon
            size={17}
            strokeWidth={active ? 2.2 : 1.8}
            className={`shrink-0 ${active ? 'text-nav-active-icon' : ''}`}
          />
        ) : (
          <ProjectBadge project={{ name: item.label, color: item.color ?? '' }} size="sm" />
        )}
        <span className={`min-w-0 flex-1 truncate ${rail}`}>{item.label}</span>
        {count ? (
          <span
            className={`min-w-5 rounded-full px-1.5 text-center text-2xs font-semibold tabular-nums leading-5 ${rail} ${
              active
                ? 'bg-nav-active-text/20 text-nav-active-text'
                : 'bg-sidebar-card text-sidebar-muted'
            }`}
          >
            {count}
          </span>
        ) : null}
        <LinkPending className={rail} />
      </Link>
    )
  }

  const sectionLabel = (label: string) => (
    <p
      className={`mb-1 mt-5 px-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-sidebar-muted ${
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
          className="fixed inset-0 z-40 animate-[fade-in_200ms_ease-out] bg-scrim lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col overflow-y-auto border-r [&>*]:shrink-0 border-line bg-sidebar px-3 pb-3 pt-5 transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          collapsed ? 'lg:w-[72px] lg:px-2.5' : ''
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`mb-5 flex h-8 items-center justify-between px-1.5 ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <Link href={workspacePath(workspace.key)} className={rail} onClick={onClose}>
            <Logo className="h-[24px]" />
          </Link>
          {collapsed && (
            /* eslint-disable-next-line @next/next/no-img-element -- static brand icon */
            <img
              src="/brand/icon-48.png"
              alt="ಆyaama"
              className="hidden size-8 rounded-lg lg:block"
            />
          )}
          <button
            className="grid size-8 place-items-center rounded-lg text-sidebar-ink hover:bg-nav-hover lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <WorkspaceSelector workspace={workspace} collapsed={collapsed} onNavigate={onClose} />

        <button
          type="button"
          onClick={() => {
            onClose()
            onNewTask()
          }}
          title={collapsed ? 'New task (N)' : undefined}
          className={`mt-3 flex h-10 w-full items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-hover active:bg-primary-active ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <Plus size={17} strokeWidth={2.4} className="shrink-0" />
          <span className={`flex-1 text-left ${rail}`}>New task</span>
          {/* Shortcut hint, desktop only; the rail has no room for it. */}
          {!collapsed && (
            <kbd className="hidden rounded border border-on-primary/30 px-1.5 font-sans text-2xs font-medium text-on-primary-muted lg:inline">
              N
            </kbd>
          )}
        </button>

        <nav className="mt-4 space-y-0.5" aria-label="Workspace navigation">
          {mainNav(workspace).map(navLink)}
        </nav>
        {sectionLabel('Projects')}
        <nav className="space-y-0.5" aria-label="Projects">
          {projectNav(workspace, projects).map(navLink)}
          {!projects.length && (
            <p className={`px-2.5 py-1.5 text-ui text-sidebar-muted ${rail}`}>No projects yet</p>
          )}
        </nav>
        {sectionLabel('Manage')}
        <nav className="space-y-0.5" aria-label="Management">
          {manageNav(workspace).map(navLink)}
        </nav>

        <div className="mt-auto space-y-1 pt-4">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden h-9 w-full items-center gap-3 rounded-lg px-2.5 text-ui text-sidebar-ink hover:bg-nav-hover hover:text-ink lg:flex ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className={rail}>Collapse</span>
          </button>
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-line bg-sidebar-card px-2 py-2 ${
              collapsed ? 'lg:flex-col lg:border-0 lg:bg-transparent lg:px-0' : ''
            }`}
          >
            <Link
              href={workspacePath(workspace.key, 'settings')}
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-2xs font-semibold text-primary-ink"
              title={collapsed ? displayName : 'Profile and settings'}
              aria-label="Profile and settings"
            >
              {displayName ? initials(displayName) : ''}
            </Link>
            <div className={`min-w-0 flex-1 ${rail}`}>
              <p className="truncate text-ui font-medium text-ink">{displayName}</p>
              <p className="truncate text-2xs text-sidebar-muted">{profile?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-sidebar-ink hover:bg-error-light hover:text-error-ink"
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

/** The current workspace as a card; opens a menu to jump to the other workspaces. */
function WorkspaceSelector({
  workspace,
  collapsed,
  onNavigate,
}: {
  workspace: WorkspaceData
  collapsed: boolean
  onNavigate: () => void
}) {
  const [menu, setMenu] = useState<CSSProperties | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const open = menu !== null
  const letter = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

  // The sidebar scrolls and slides, so the menu is portalled to <body> at fixed coordinates:
  // below the card, or beside it when the desktop sidebar is a narrow rail.
  const toggle = () => {
    if (open || !button.current) return setMenu(null)
    const rect = button.current.getBoundingClientRect()
    const beside = collapsed && window.matchMedia('(min-width: 1024px)').matches
    setMenu(
      beside
        ? { position: 'fixed', top: rect.top, left: rect.right + 8 }
        : { position: 'fixed', top: rect.bottom + 6, left: rect.left },
    )
  }
  const close = () => setMenu(null)

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? `${workspace.name} workspace` : undefined}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-line bg-sidebar-card p-2 text-left hover:border-line-strong ${
          collapsed ? 'lg:justify-center lg:border-0 lg:bg-transparent lg:p-0' : ''
        }`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-on-primary">
          {letter(workspace.name)}
        </span>
        <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="block text-2xs font-medium uppercase tracking-[0.08em] text-sidebar-muted">
            {workspace.switchLabel} workspace
          </span>
          <span className="block truncate text-sm font-semibold text-ink">{workspace.name}</span>
        </span>
        <ChevronsUpDown
          size={15}
          className={`shrink-0 text-sidebar-muted ${collapsed ? 'lg:hidden' : ''}`}
        />
      </button>
      {menu &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[60] cursor-default"
              onClick={close}
              aria-label="Close workspace menu"
            />
            <div
              role="menu"
              style={menu}
              className="neo-popover animate-pop z-[61] w-[248px] rounded-xl p-1.5"
              onKeyDown={(event) => event.key === 'Escape' && close()}
            >
              <p className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                Switch workspace
              </p>
              {SPACE_KEYS.map((key) => {
                const current = key === workspace.key
                const name = current ? workspace.name : spaces[key].name
                return (
                  <Link
                    key={key}
                    role="menuitem"
                    href={workspacePath(key)}
                    onClick={() => {
                      close()
                      onNavigate()
                    }}
                    aria-current={current ? 'page' : undefined}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-md text-xs font-bold ${
                        current ? 'bg-primary text-on-primary' : 'bg-surface-3 text-ink-2'
                      }`}
                    >
                      {letter(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{name}</span>
                      <span className="block text-2xs text-ink-3">{spaces[key].switchLabel}</span>
                    </span>
                    {current && <Check size={15} className="text-primary-ink" />}
                    <LinkPending />
                  </Link>
                )
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
