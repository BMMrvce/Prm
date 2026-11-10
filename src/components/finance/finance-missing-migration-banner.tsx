/** Shown instead of budgets/savings/recurring until the personal finance migration has run. */
export function FinanceMissingMigrationBanner() {
  return (
    <div className="neo-card max-w-2xl rounded-xl p-6">
      <h3 className="font-semibold">Finance needs a quick database update</h3>
      <p className="mt-2 text-sm text-ink-2">
        Run{' '}
        <code className="rounded bg-surface-2 px-1">
          supabase/migrations/202611100004_personal_finance.sql
        </code>{' '}
        in the Supabase SQL editor (Project → SQL Editor → paste → Run), then reload this page. It
        adds budgets, savings goals and recurring payments, plus a payment method and note on
        transactions. Your existing transactions are untouched.
      </p>
    </div>
  )
}
