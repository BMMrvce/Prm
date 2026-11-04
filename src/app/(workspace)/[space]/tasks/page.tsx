import type { Metadata } from 'next'
import { TaskBoard } from '@/components/tasks/task-board'

export const metadata: Metadata = { title: 'My Tasks' }

export default function TasksPage() {
  return (
    <div className="mt-5">
      <TaskBoard />
    </div>
  )
}
