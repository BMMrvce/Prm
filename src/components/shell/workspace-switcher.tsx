import Link from 'next/link'
import { SPACE_KEYS, spaces } from '@/data/workspaces'
import { workspacePath } from '@/lib/routes'
import type { SpaceKey } from '@/types/workbench'

export function WorkspaceSwitcher({ active }: { active: SpaceKey }) {
  return (
    <nav className="flex items-center gap-1.5" aria-label="Switch dashboard">
      {SPACE_KEYS.map((key) => (
        <Link
          key={key}
          href={workspacePath(key)}
          aria-current={active === key ? 'page' : undefined}
          className={`flex h-9 items-center rounded-lg border px-3.5 text-[15px] font-medium transition ${
            active === key
              ? 'border-[#4638ca] bg-[#4638ca] text-white'
              : 'border-[#d8d8dc] bg-white text-[#2f2f33] hover:bg-[#f4f4f6]'
          }`}
        >
          {spaces[key].switchLabel}
        </Link>
      ))}
    </nav>
  )
}
