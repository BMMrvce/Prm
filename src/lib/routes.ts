import type { Project, SpaceKey, WorkspaceData } from '@/types/workbench'

/**
 * Single source of truth for workspace URLs. Every sidebar link and page title is
 * derived from here, so adding a route means editing this file plus creating the
 * matching `page.tsx` under `src/app/(workspace)/[space]/`.
 */
/** Icon names the sidebar maps to Lucide icons (kept as strings so this file stays data-only). */
export type NavIcon =
  | 'home'
  | 'tasks'
  | 'notes'
  | 'inbox'
  | 'calendar'
  | 'time'
  | 'money'
  | 'habits'
  | 'reading'
  | 'focus'
  | 'learning'
  | 'goals'
  | 'projects'
  | 'integrations'
  | 'settings'
  | 'project'

export type NavItem = {
  label: string
  href: string
  icon: NavIcon
  color?: string
  /** Sidebar section header to cluster under; unset renders a flat list (Office/Studio). */
  group?: string
}

export function workspacePath(space: SpaceKey, ...segments: string[]) {
  return ['', space, ...segments].join('/')
}

export function projectSlug(name: string) {
  return name
    .toLowerCase()
    .replaceAll('&', 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function projectPath(space: SpaceKey, project: Pick<Project, 'slug'>) {
  return workspacePath(space, 'projects', project.slug)
}

export function expensesLabel(workspace: Pick<WorkspaceData, 'key'>) {
  if (workspace.key === 'office') return 'Reimbursements'
  if (workspace.key === 'personal') return 'Finance'
  return 'Income & Expenses'
}

export function mainNav(workspace: WorkspaceData): NavItem[] {
  const path = (...segments: string[]) => workspacePath(workspace.key, ...segments)
  if (workspace.key === 'personal') {
    return [
      { label: 'Home', href: path(), icon: 'home', group: 'Personal' },
      { label: 'Tasks', href: path('tasks'), icon: 'tasks', group: 'Personal' },
      { label: 'Calendar', href: path('calendar'), icon: 'calendar', group: 'Personal' },
      { label: 'Habits', href: path('habits'), icon: 'habits', group: 'Growth' },
      { label: 'Reading', href: path('reading'), icon: 'reading', group: 'Growth' },
      { label: 'Learning', href: path('learning'), icon: 'learning', group: 'Growth' },
      { label: 'Goals', href: path('goals'), icon: 'goals', group: 'Growth' },
      { label: 'Notes', href: path('notes'), icon: 'notes', group: 'Resources' },
      {
        label: expensesLabel(workspace),
        href: path('expenses'),
        icon: 'money',
        group: 'Resources',
      },
      { label: 'Settings', href: path('settings'), icon: 'settings', group: 'Settings' },
    ]
  }
  return [
    { label: 'Home', href: path(), icon: 'home' },
    { label: 'My Tasks', href: path('tasks'), icon: 'tasks' },
    { label: 'Notes', href: path('notes'), icon: 'notes' },
    { label: 'Inbox', href: path('inbox'), icon: 'inbox' },
    { label: 'Calendar', href: path('calendar'), icon: 'calendar' },
    { label: 'Time Management', href: path('time'), icon: 'time' },
    { label: expensesLabel(workspace), href: path('expenses'), icon: 'money' },
  ]
}

export function projectNav(workspace: WorkspaceData, projects: Project[]): NavItem[] {
  return projects.map((project) => ({
    label: project.name,
    href: projectPath(workspace.key, project),
    icon: 'project' as const,
    color: project.color,
  }))
}

export function manageNav(workspace: WorkspaceData): NavItem[] {
  const path = (...segments: string[]) => workspacePath(workspace.key, ...segments)
  // Personal's sidebar is fully covered by mainNav()'s 4 groups (Settings included);
  // Projects/Integrations stay reachable by URL and via a link from Settings, just unlinked here.
  if (workspace.key === 'personal') return []
  return [
    { label: 'All Projects', href: path('projects'), icon: 'projects' },
    { label: 'Integrations', href: path('integrations'), icon: 'integrations' },
    { label: 'Settings', href: path('settings'), icon: 'settings' },
  ]
}

/** Heading shown in the workspace header for the current URL. */
export function pageTitle(
  workspace: WorkspaceData,
  projects: Project[],
  pathname: string,
  homeTitle: string,
) {
  if (pathname === workspacePath(workspace.key)) return homeTitle
  const items = [...mainNav(workspace), ...projectNav(workspace, projects), ...manageNav(workspace)]
  return items.find((item) => item.href === pathname)?.label ?? workspace.name
}

/** One-line description under the page heading, by the first path segment after the space. */
const SUBTITLES: Record<string, string> = {
  tasks: 'Everything on your plate, grouped by when it is due',
  notes: 'Your pages and meeting notes · type / for commands',
  inbox: 'Mail from the mailbox connected to this workspace',
  calendar: 'Meetings and task due dates',
  time: 'Where your hours go',
  expenses: 'Track spending and claims',
  projects: 'Projects in this workspace and ones shared with you',
  integrations: 'Connect your mailbox and other services',
  settings: 'Workspace, appearance and account',
  habits: 'Daily routines, streaks and consistency',
  reading: 'Your book library, sessions and takeaways',
  learning: 'Technical topics, resources and progress',
  goals: 'Career, financial and personal goals with milestones',
}

export function pageSubtitle(workspace: WorkspaceData, pathname: string) {
  const [, , section, project] = pathname.split('/')
  if (section === 'projects' && project) return `Project in ${workspace.name}`
  return SUBTITLES[section ?? ''] ?? `${workspace.name} workspace`
}
