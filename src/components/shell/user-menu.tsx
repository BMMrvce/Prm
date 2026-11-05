'use client'

import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { initials } from '@/lib/format'
import { workspacePath } from '@/lib/routes'
import { useWorkspace } from '@/state/workbench-store'

/** Avatar button with the signed-in account and sign-out. */
export function UserMenu() {
  const { profile, workspace, signOut } = useWorkspace()
  const [open, setOpen] = useState(false)
  const name = profile?.fullName || profile?.email || ''

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid size-8 place-items-center rounded-full bg-[#eef0ff] text-[11px] font-semibold text-[#2721a6]"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {name ? initials(name) : ''}
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close account menu"
          />
          <div className="neo-card absolute right-0 top-11 z-30 w-[min(260px,calc(100vw-2rem))] rounded-xl p-2">
            <div className="px-2 py-1.5">
              <p className="truncate text-[13px] font-medium">{profile?.fullName}</p>
              <p className="truncate text-[11px] text-[#77777d]">{profile?.email}</p>
            </div>
            <Link
              href={workspacePath(workspace.key, 'settings')}
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#f5f5f7]"
            >
              <Settings size={14} /> Settings
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-[#a52828] hover:bg-[#fdf0f0]"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
