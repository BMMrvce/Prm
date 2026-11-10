import { localDate } from '@/lib/format'
import type { Budget, ExpenseRecord, RecurringFrequency, RecurringPayment, SavingsContribution, SavingsGoal } from '@/types/workbench'

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Housing',
  'Utilities',
  'Health',
  'Entertainment',
  'Education',
  'Subscriptions',
  'Personal',
  'Other',
] as const

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'] as const

export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank transfer', 'Other'] as const

/** `YYYY-MM` for a date (or now). */
export function monthKey(date: Date | string = new Date()) {
  return (typeof date === 'string' ? date : localDate(date)).slice(0, 7)
}

function daysInMonthOf(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/** How many days (including today) are left in `key`; the full month if `key` isn't the current one. */
export function daysRemainingInMonth(key: string, today = new Date()) {
  const total = daysInMonthOf(key)
  if (key !== monthKey(today)) return total
  return Math.max(1, total - today.getDate() + 1)
}

export function monthLabel(key: string) {
  return new Date(`${key}-01T12:00`).toLocaleDateString([], { month: 'long', year: 'numeric' })
}

export function shiftMonthKey(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number)
  return monthKey(new Date(year, month - 1 + delta, 1))
}

export type MonthSummary = {
  income: number
  expenses: number
  net: number
  /** Expense-only, by category — transfers and income never appear here. */
  byCategory: Record<string, number>
}

/**
 * Totals for one month. `transfer` and `reimbursement` entries are excluded from both
 * income and expenses — moving money between your own accounts isn't earning or spending.
 */
export function summarizeMonth(expenses: ExpenseRecord[], key: string): MonthSummary {
  const byCategory: Record<string, number> = {}
  let income = 0
  let spent = 0
  for (const entry of expenses) {
    if (!entry.date.startsWith(key)) continue
    if (entry.kind === 'income') income += entry.amount
    else if (entry.kind === 'expense') {
      spent += entry.amount
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + entry.amount
    }
  }
  return { income, expenses: spent, net: income - spent, byCategory }
}

export type CategoryBudgetProgress = {
  category: string
  limit: number
  spent: number
  pct: number | null
}

export type BudgetProgress = {
  overallLimit: number | null
  overallSpent: number
  overallRemaining: number | null
  overallPct: number | null
  /** Remaining budget spread over the days left in the month; null with no overall limit. */
  dailySafeToSpend: number | null
  perCategory: CategoryBudgetProgress[]
}

export function budgetProgress(
  budget: Budget | null,
  byCategory: Record<string, number>,
  key: string,
  today = new Date(),
): BudgetProgress {
  const overallSpent = Object.values(byCategory).reduce((sum, value) => sum + value, 0)
  const overallLimit = budget?.monthlyLimit ?? null
  const overallRemaining = overallLimit === null ? null : overallLimit - overallSpent
  const overallPct = overallLimit ? Math.round((overallSpent / overallLimit) * 100) : null
  const dailySafeToSpend =
    overallRemaining === null ? null : Math.max(0, overallRemaining) / daysRemainingInMonth(key, today)
  const perCategory = Object.entries(budget?.categoryLimits ?? {})
    .map(([category, limit]) => {
      const spent = byCategory[category] ?? 0
      return { category, limit, spent, pct: limit > 0 ? Math.round((spent / limit) * 100) : null }
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
  return { overallLimit, overallSpent, overallRemaining, overallPct, dailySafeToSpend, perCategory }
}

/** Visual tone for a consumed-percentage: calm under 80%, warning from 80%, over past 100%. */
export function budgetTone(pct: number | null): 'ok' | 'warn' | 'over' {
  if (pct === null) return 'ok'
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'warn'
  return 'ok'
}

/** Net saved toward a goal so far: contributions minus withdrawals, never below zero. */
export function goalCurrentAmount(goalId: string, contributions: SavingsContribution[]) {
  const net = contributions
    .filter((item) => item.goalId === goalId)
    .reduce((sum, item) => sum + (item.direction === 'contribution' ? item.amount : -item.amount), 0)
  return Math.max(0, net)
}

export function goalProgress(goal: SavingsGoal, contributions: SavingsContribution[]) {
  const current = goalCurrentAmount(goal.id, contributions)
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((current / goal.targetAmount) * 100)) : 0
  return { current, pct }
}

const MONTHLY_FACTOR: Record<RecurringFrequency, number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

/** Active recurring items normalized to a monthly amount, split by direction. */
export function monthlyCommitments(items: RecurringPayment[]) {
  let expenseMonthly = 0
  let incomeMonthly = 0
  for (const item of items) {
    if (!item.active) continue
    const monthly = item.amount * MONTHLY_FACTOR[item.frequency]
    if (item.kind === 'expense') expenseMonthly += monthly
    else incomeMonthly += monthly
  }
  return { expenseMonthly, incomeMonthly }
}

export type FinanceInsights = {
  savingsRate: number | null
  highestCategory: { category: string; amount: number } | null
  avgDailySpend: number
  /** % change in total spend vs the previous month; null with nothing to compare. */
  vsLastMonthPct: number | null
}

/** Compact insight numbers, computed only from real transactions — never fabricated. */
export function financeInsights(expenses: ExpenseRecord[], key: string, today = new Date()): FinanceInsights {
  const summary = summarizeMonth(expenses, key)
  const previous = summarizeMonth(expenses, shiftMonthKey(key, -1))
  const savingsRate = summary.income > 0 ? Math.round((summary.net / summary.income) * 100) : null
  const highestEntry = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0]
  const highestCategory = highestEntry ? { category: highestEntry[0], amount: highestEntry[1] } : null
  const elapsedDays = key === monthKey(today) ? today.getDate() : daysInMonthOf(key)
  const avgDailySpend = elapsedDays > 0 ? summary.expenses / elapsedDays : 0
  const vsLastMonthPct =
    previous.expenses > 0 ? Math.round(((summary.expenses - previous.expenses) / previous.expenses) * 100) : null
  return { savingsRate, highestCategory, avgDailySpend, vsLastMonthPct }
}
