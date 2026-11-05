import type { ReactNode } from 'react'
import { WorkspaceShell } from '@/components/shell/workspace-shell'
import { SPACE_KEYS } from '@/data/workspaces'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

// /office, /studio and /personal are prerendered. Any other value 404s in resolveWorkspace().
// dynamicParams stays on so database-backed project slugs below can render on demand.
export function generateStaticParams() {
  return SPACE_KEYS.map((space) => ({ space }))
}

export default async function SpaceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: SpaceParams
}) {
  await resolveWorkspace(params)
  return <WorkspaceShell>{children}</WorkspaceShell>
}
