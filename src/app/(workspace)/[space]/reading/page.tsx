import type { Metadata } from 'next'
import { ReadingPanel } from '@/components/growth/reading-panel'
import { requirePersonalWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Reading Library' }

export default async function ReadingPage({ params }: { params: SpaceParams }) {
  await requirePersonalWorkspace(params)
  return (
    <div className="mt-5">
      <ReadingPanel />
    </div>
  )
}
