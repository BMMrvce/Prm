import Link from 'next/link'
import { projectSlug, workspacePath } from '@/lib/routes'
import type { WorkspaceData } from '@/types/workbench'

/** Project cards; pass `projects` to show a subset (e.g. a single project page). */
export function ProjectGrid({
  workspace,
  projects = workspace.projects,
}: {
  workspace: WorkspaceData
  projects?: string[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const index = workspace.projects.indexOf(project)
        const progress = 58 + index * 12
        return (
          <Link
            href={workspacePath(workspace.key, 'projects', projectSlug(project))}
            className="neo-card block rounded-xl p-5 text-left transition hover:border-[#a9a4ec]"
            key={project}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{project}</h3>
              <span className="rounded-full bg-[#e6f7ea] px-2 py-1 text-[10px] text-[#2f7045]">
                On track
              </span>
            </div>
            <p className="mt-2 text-xs text-[#77777d]">
              {workspace.switchLabel} · {4 + index * 3} open tasks
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#eeeeef]">
              <div className="h-full rounded-full bg-[#493bd0]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#77777d]">{progress}% complete</p>
          </Link>
        )
      })}
    </div>
  )
}
