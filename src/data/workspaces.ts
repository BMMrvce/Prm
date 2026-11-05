import type { SpaceKey, WorkspaceData } from '@/types/workbench'

/**
 * The three fixed workspaces behind `/office`, `/studio` and `/personal`. Only static
 * configuration lives here; projects, tasks, meetings and the rest come from Supabase.
 */
export const spaces: Record<SpaceKey, WorkspaceData> = {
  office: {
    key: 'office',
    switchLabel: 'Office',
    name: 'Office',
    taskPrefix: 'WR',
  },
  studio: {
    key: 'studio',
    switchLabel: 'Studio',
    name: 'Studio',
    taskPrefix: 'ST',
  },
  personal: {
    key: 'personal',
    switchLabel: 'Personal',
    name: 'Personal',
    taskPrefix: 'PS',
  },
}

export const SPACE_KEYS = Object.keys(spaces) as SpaceKey[]

export function isSpaceKey(value: string): value is SpaceKey {
  return Object.hasOwn(spaces, value)
}

export function findWorkspace(key: string): WorkspaceData | undefined {
  return isSpaceKey(key) ? spaces[key] : undefined
}

/** Each user owns one database workspace per space; slugs are globally unique. */
export function workspaceSlug(space: SpaceKey, userId: string) {
  return `${space}-${userId.replaceAll('-', '')}`
}
