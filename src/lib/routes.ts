import type { SpaceKey, WorkspaceData } from '@/types/workbench'

/**
 * Single source of truth for workspace URLs. Every sidebar link, page title and
 * static param is derived from here, so adding a route means editing this file
 * plus creating the matching `page.tsx` under `src/app/(workspace)/[space]/`.
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

export function findProjectBySlug(workspace: WorkspaceData, slug: string) {
  return workspace.projects.find((name) => projectSlug(name) === slug)
}

export function expensesLabel(workspace: WorkspaceData) {
  return workspace.key === 'office' ? 'Reimbursements' : 'Expenses'
}

export function mainNav(workspace: WorkspaceData): NavItem[] {
  const path = (...segments: string[]) => workspacePath(workspace.key, ...segments)
  return [
    { label: 'Home', href: path() },
    { label: 'My Tasks', href: path('tasks') },
    { label: 'Inbox', href: path('inbox') },
    { label: 'Calendar', href: path('calendar') },
    { label: expensesLabel(workspace), href: path('expenses') },
  ]
}

export function projectNav(workspace: WorkspaceData): NavItem[] {
  return workspace.projects.map((name) => ({
    label: name,
    href: workspacePath(workspace.key, 'projects', projectSlug(name)),
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
export function pageTitle(workspace: WorkspaceData, pathname: string) {
  if (pathname === workspacePath(workspace.key)) return workspace.greeting
  const items = [...mainNav(workspace), ...projectNav(workspace), ...manageNav(workspace)]
  return items.find((item) => item.href === pathname)?.label ?? workspace.name
}
