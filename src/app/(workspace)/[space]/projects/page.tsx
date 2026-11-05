import type { Metadata } from 'next'
import { ProjectGrid } from '@/components/projects/project-grid'

export const metadata: Metadata = { title: 'All Projects' }

export default function ProjectsPage() {
  return (
    <div className="mt-5">
      <ProjectGrid />
    </div>
  )
}
