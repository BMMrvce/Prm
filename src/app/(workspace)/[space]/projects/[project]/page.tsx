import type { Metadata } from 'next'
import { ProjectDetail } from '@/components/projects/project-detail'

export const metadata: Metadata = { title: 'Project' }

// Projects live in the database, so this page renders on demand for any slug.
export default function ProjectPage() {
  return (
    <div className="mt-5">
      <ProjectDetail />
    </div>
  )
}
