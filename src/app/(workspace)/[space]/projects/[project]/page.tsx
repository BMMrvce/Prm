import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProjectGrid } from '@/components/projects/project-grid'
import { findWorkspace } from '@/data/workspaces'
import { findProjectBySlug, projectSlug } from '@/lib/routes'
import { resolveWorkspace } from '@/lib/workspace'

type ProjectParams = Promise<{ space: string; project: string }>

export const dynamicParams = false

export function generateStaticParams({ params }: { params: { space: string } }) {
  const workspace = findWorkspace(params.space)
  return (workspace?.projects ?? []).map((name) => ({ project: projectSlug(name) }))
}

async function resolveProject(params: ProjectParams) {
  const workspace = await resolveWorkspace(params)
  const project = findProjectBySlug(workspace, (await params).project)
  if (!project) notFound()
  return { workspace, project }
}

export async function generateMetadata({ params }: { params: ProjectParams }): Promise<Metadata> {
  const { project } = await resolveProject(params)
  return { title: project }
}

export default async function ProjectPage({ params }: { params: ProjectParams }) {
  const { workspace, project } = await resolveProject(params)
  return (
    <div className="mt-5">
      <ProjectGrid workspace={workspace} projects={[project]} />
    </div>
  )
}
