/** Shown instead of a Growth panel until the growth tracker migration has been applied. */
export function MissingMigrationBanner() {
  return (
    <div className="neo-card max-w-2xl rounded-xl p-6">
      <h3 className="font-semibold">Growth tracker needs a quick database update</h3>
      <p className="mt-2 text-sm text-ink-2">
        Run{' '}
        <code className="rounded bg-surface-2 px-1">
          supabase/migrations/202611100001_growth_tracker.sql
        </code>{' '}
        in the Supabase SQL editor (Project → SQL Editor → paste → Run), then reload this page. It
        only adds new tables for habits, reading and focus tracking.
      </p>
    </div>
  )
}
