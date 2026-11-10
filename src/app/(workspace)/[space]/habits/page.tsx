import type { Metadata } from 'next'
import { HabitList } from '@/components/growth/habit-list'
import { requirePersonalWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Habits & Routines' }

export default async function HabitsPage({ params }: { params: SpaceParams }) {
  await requirePersonalWorkspace(params)
  return (
    <div className="mt-5">
      <HabitList />
    </div>
  )
}
