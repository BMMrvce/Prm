import type { Metadata } from 'next'
import { GoalsList } from '@/components/growth/goals-list'
import { requirePersonalWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Goals' }

export default async function GoalsPage({ params }: { params: SpaceParams }) {
  await requirePersonalWorkspace(params)
  return (
    <div className="mt-5">
      <GoalsList />
    </div>
  )
}
