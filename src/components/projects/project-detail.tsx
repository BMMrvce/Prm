'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PeoplePicker } from '@/components/people/people-picker'
import { TaskBoard } from '@/components/tasks/task-board'
import { shareableDomain } from '@/lib/email-domain'
import { workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'

/** One project (looked up by the `[project]` slug), who it is shared with, and its tasks. */
export function ProjectDetail() {
  const { project: slug } = useParams<{ project: string }>()
  const { workspace, ready, profile, projects, isOwn, tagProject, untagProject, setProjectDomain } =
    useWorkspace()
  const project = projects.find((item) => item.slug === slug)

  if (!ready) return <p className="text-sm text-[#88888e]">Loading project…</p>
  if (!project) {
    return (
      <div className="neo-card rounded-xl p-6 text-sm">
        <p>This project does not exist in {workspace.name}.</p>
        <Link
          href={workspacePath(workspace.key, 'projects')}
          className="mt-3 inline-block font-medium text-[#493bd0]"
        >
          ← All projects
        </Link>
      </div>
    )
  }
  const own = isOwn(project.workspaceId)
  const domain = shareableDomain(profile?.email)
  return (
    <div className="space-y-4">
      <section className="neo-card rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{project.name}</h2>
            <p className="text-xs text-[#73737a]">
              {own
                ? 'People you tag see this project and all its tasks on their dashboard.'
                : `Shared by ${project.sharedBy}${project.sharedDomain ? ` with everyone @${project.sharedDomain}` : ''}. Tasks you add here belong to their workspace.`}
            </p>
          </div>
        </div>
        {own && domain && (
          <label className="mt-4 flex items-start gap-2 text-xs text-[#55555c]">
            <input
              type="checkbox"
              checked={project.sharedDomain === domain}
              onChange={(event) =>
                void setProjectDomain(project.id, event.target.checked ? domain : null)
              }
              className="mt-0.5 size-4 shrink-0 accent-[#493bd0]"
            />
            <span>
              Share with everyone <strong className="font-medium">@{domain}</strong>, including
              people who join later.
            </span>
          </label>
        )}
        <div className="mt-4 max-w-xl">
          <PeoplePicker
            ids={project.members}
            canEdit={own}
            emptyText="Not shared with anyone yet."
            onAdd={(person) => tagProject(project.id, person)}
            onRemove={(id) => void untagProject(project.id, id)}
          />
        </div>
      </section>
      <TaskBoard projectId={project.id} />
    </div>
  )
}
