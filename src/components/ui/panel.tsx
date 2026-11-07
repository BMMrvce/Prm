import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Header shared by every dashboard panel: a tinted icon tile, the title, an optional
 * supporting line, and actions on the right.
 */
export function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  tone = 'primary',
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle?: ReactNode
  /** Icon tile color: the signature color or the complementary accent. */
  tone?: 'primary' | 'accent'
  children?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${
          tone === 'accent'
            ? 'bg-accent-light text-accent-ink'
            : 'bg-primary-light text-primary-ink'
        }`}
        aria-hidden
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-card font-semibold text-ink">{title}</h2>
        {subtitle && <p className="truncate text-xs text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
