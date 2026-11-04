import type { ReactNode } from 'react'
import { WorkbenchProvider } from '@/state/workbench-store'

/** Shared client state for all workspaces, kept alive across route changes. */
export default function WorkspaceGroupLayout({ children }: { children: ReactNode }) {
  return <WorkbenchProvider>{children}</WorkbenchProvider>
}
