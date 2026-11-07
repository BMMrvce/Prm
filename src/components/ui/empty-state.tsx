import type { LucideIcon } from 'lucide-react'

/** Quiet placeholder for an empty list: an icon in a soft circle and one line of guidance. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center px-4 py-7 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-3">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-ui font-medium text-ink-2">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}
