'use client'

import { FolderKanban } from 'lucide-react'
import { ProjectBadge, ProjectColorPicker } from '@/components/projects/project-color'
import { PanelHeader } from '@/components/ui/panel'
import { useWorkspace } from '@/state/workbench-store'

/** Settings → Project colors: every project in this workspace with its color picker. */
export function ProjectColors() {
  const { workspace, ready, projects } = useWorkspace()
  return (
    <section id="project-colors" className="neo-card scroll-mt-6 rounded-xl p-6">
      <PanelHeader
        icon={FolderKanban}
        title="Project colors"
        subtitle={`How projects in ${workspace.name} are marked in the sidebar, cards and tasks`}
      />
      {!ready && <p className="mt-4 text-sm text-ink-3">Loading projects…</p>}
      {ready && !projects.length && (
        <p className="mt-4 text-sm text-ink-3">No projects in this workspace yet.</p>
      )}
      <ul className="mt-4 divide-y divide-line-soft">
        {projects.map((project) => (
          <li
            key={project.id}
            className="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-center"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <ProjectBadge project={project} />
              <span className="truncate text-sm font-medium text-ink">{project.name}</span>
            </span>
            <ProjectColorPicker project={project} />
          </li>
        ))}
      </ul>
    </section>
  )
}
