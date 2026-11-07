import Link from 'next/link'
import { SPACE_KEYS, spaces } from '@/data/workspaces'
import { LinkPending } from '@/components/ui/link-pending'
import { workspacePath } from '@/lib/routes'
import type { SpaceKey } from '@/types/workbench'

/** Segmented control for Office / Studio / Personal; the active workspace is filled with the brand color. */
export function WorkspaceSwitcher({ active }: { active: SpaceKey }) {
  return (
    <nav
      className="grid grid-cols-3 rounded-lg border border-line bg-surface-2 p-1 sm:flex"
      aria-label="Switch workspace"
    >
      {SPACE_KEYS.map((key) => (
        <Link
          key={key}
          href={workspacePath(key)}
          aria-current={active === key ? 'page' : undefined}
          className={`flex h-8 items-center justify-center rounded-md px-3.5 text-ui font-medium ${
            active === key
              ? 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover active:bg-primary-active'
              : 'text-ink-2 hover:bg-segment hover:text-ink'
          }`}
        >
          {spaces[key].switchLabel}
          <LinkPending className="ml-1.5" />
        </Link>
      ))}
    </nav>
  )
}
