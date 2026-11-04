import { notFound } from 'next/navigation'
import { findWorkspace } from '@/data/workspaces'

export type SpaceParams = Promise<{ space: string }>

/** Resolves the `[space]` route param for server pages, 404ing on unknown workspaces. */
export async function resolveWorkspace(params: SpaceParams) {
  const { space } = await params
  const workspace = findWorkspace(space)
  if (!workspace) notFound()
  return workspace
}
