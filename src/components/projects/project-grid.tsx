'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { shareableDomain } from '@/lib/email-domain'
import { projectPath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'

/** All projects with real task progress, plus a form to create one. */
export function ProjectGrid() {
  const { workspace, ready, profile, projects, tasks, addProject } = useWorkspace()
  const [name, setName] = useState('')
  const [shareWithDomain, setShareWithDomain] = useState(false)
  const domain = shareableDomain(profile?.email)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    if (await addProject(name.trim(), shareWithDomain ? domain : null)) {
      setName('')
      setShareWithDomain(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="neo-card max-w-xl rounded-xl p-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
            placeholder="New project name"
            aria-label="New project name"
            maxLength={120}
          />
          <button
            type="submit"
            disabled={!ready}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60 hover:bg-primary-hover active:bg-primary-active"
          >
            <Plus size={15} /> Create project
          </button>
        </div>
        {domain && (
          <label className="mt-3 flex items-start gap-2 px-1 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={shareWithDomain}
              onChange={(event) => setShareWithDomain(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              Share with everyone <strong className="font-medium">@{domain}</strong>. They see it
              and its tasks on their {workspace.switchLabel} dashboard, including people who join
              later.
            </span>
          </label>
        )}
      </form>
      {!ready && <p className="text-sm text-ink-3">Loading projects…</p>}
      {ready && !projects.length && (
        <p className="text-sm text-ink-3">No projects yet. Create your first one above.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id)
          const done = projectTasks.filter((task) => task.state === 'completed').length
          const open = projectTasks.length - done
          const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0
          return (
            <Link
              href={projectPath(workspace.key, project)}
              className="neo-card block min-w-0 rounded-xl p-5 text-left transition hover:border-secondary"
              key={project.id}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-semibold">{project.name}</h3>
                <span className="shrink-0 rounded-full bg-primary-light px-2 py-1 text-[11px] capitalize text-primary-ink">
                  {project.status}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-ink-2">
                {open} open · {done} done
                {project.sharedBy
                  ? ` · Shared by ${project.sharedBy}`
                  : project.sharedDomain
                    ? ` · Shared with @${project.sharedDomain}`
                    : project.members.length
                      ? ` · Shared with ${project.members.length}`
                      : ''}
              </p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: project.color }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-2">{progress}% complete</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
