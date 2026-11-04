import type { Metadata } from 'next'
import { ExpenseTracker } from '@/components/expenses/expense-tracker'
import { expensesLabel } from '@/lib/routes'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export async function generateMetadata({ params }: { params: SpaceParams }): Promise<Metadata> {
  const workspace = await resolveWorkspace(params)
  return { title: expensesLabel(workspace) }
}

export default function ExpensesPage() {
  return (
    <div className="mt-5">
      <ExpenseTracker />
    </div>
  )
}
