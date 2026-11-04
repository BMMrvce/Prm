import type { Metadata } from 'next'
import { ProjectGrid } from '@/components/projects/project-grid'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'All Projects' }

export default async function ProjectsPage({ params }: { params: SpaceParams }) {
  const workspace = await resolveWorkspace(params)
  return (
    <div className="mt-5">
      <ProjectGrid workspace={workspace} />
    </div>
  )
}
