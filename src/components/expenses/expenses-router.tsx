'use client'

import { FinanceView } from '@/components/finance/finance-view'
import { useWorkspace } from '@/state/workbench-store'
import { ExpenseTracker } from './expense-tracker'

/** Personal gets the full Finance system; Office and Studio keep the unmodified tracker. */
export function ExpensesRouter() {
  const { workspace } = useWorkspace()
  if (workspace.key === 'personal') return <FinanceView />
  return <ExpenseTracker />
}
