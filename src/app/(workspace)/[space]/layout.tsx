import type { ReactNode } from 'react'
import { WorkspaceShell } from '@/components/shell/workspace-shell'
import { SPACE_KEYS } from '@/data/workspaces'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

// Only /office, /studio and /personal exist; anything else is a 404.
export const dynamicParams = false

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
