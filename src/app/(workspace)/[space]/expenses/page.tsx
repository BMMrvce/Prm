import type { Metadata } from 'next'
import { ExpensesRouter } from '@/components/expenses/expenses-router'
import { expensesLabel } from '@/lib/routes'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export async function generateMetadata({ params }: { params: SpaceParams }): Promise<Metadata> {
  const workspace = await resolveWorkspace(params)
  return { title: expensesLabel(workspace) }
}

export default function ExpensesPage() {
  return (
    <div className="mt-5">
      <ExpensesRouter />
    </div>
  )
}
