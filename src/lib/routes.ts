import type { Project, SpaceKey, WorkspaceData } from '@/types/workbench'

/**
 * Single source of truth for workspace URLs. Every sidebar link and page title is
 * derived from here, so adding a route means editing this file plus creating the
 * matching `page.tsx` under `src/app/(workspace)/[space]/`.
 */
export type NavItem = { label: string; href: string }

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
  return workspace.key === 'office' ? 'Reimbursements' : 'Income & Expenses'
}

export function mainNav(workspace: WorkspaceData): NavItem[] {
  const path = (...segments: string[]) => workspacePath(workspace.key, ...segments)
  return [
    { label: 'Home', href: path() },
    { label: 'My Tasks', href: path('tasks') },
    { label: 'Inbox', href: path('inbox') },
    { label: 'Calendar', href: path('calendar') },
    { label: 'Time Management', href: path('time') },
    { label: expensesLabel(workspace), href: path('expenses') },
  ]
}

export function projectNav(workspace: WorkspaceData, projects: Project[]): NavItem[] {
  return projects.map((project) => ({
    label: project.name,
    href: projectPath(workspace.key, project),
  }))
}

export function manageNav(workspace: WorkspaceData): NavItem[] {
  const path = (...segments: string[]) => workspacePath(workspace.key, ...segments)
  return [
    { label: 'All Projects', href: path('projects') },
    { label: 'Integrations', href: path('integrations') },
    { label: 'Settings', href: path('settings') },
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
