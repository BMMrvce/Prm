import type { Metadata } from 'next'
import { LearningList } from '@/components/growth/learning-list'
import { requirePersonalWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Learning' }

export default async function LearningPage({ params }: { params: SpaceParams }) {
  await requirePersonalWorkspace(params)
  return (
    <div className="mt-5">
      <LearningList />
    </div>
  )
}
