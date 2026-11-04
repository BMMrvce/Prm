'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mainNav, manageNav, projectNav, type NavItem } from '@/lib/routes'
import type { WorkspaceData } from '@/types/workbench'

export function Sidebar({
  workspace,
  open,
  desktopVisible,
  onClose,
}: {
  workspace: WorkspaceData
  open: boolean
  desktopVisible: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const navLink = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      aria-current={pathname === item.href ? 'page' : undefined}
      className={`block w-full rounded-md px-3 py-2 text-left text-[15px] transition ${
        pathname === item.href
          ? 'bg-[#eeeeff] font-medium text-[#231a8f]'
          : 'text-[#36363a] hover:bg-[#f5f5f7]'
      }`}
    >
      {item.label}
    </Link>
  )

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[246px] flex-col border-r border-[#dedee2] bg-white px-3 py-6 transition-transform lg:static lg:translate-x-0 ${
          desktopVisible ? 'lg:flex' : 'lg:hidden'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-3 flex items-center justify-between px-2">
          <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-[#111114]">
            {workspace.name}
          </h1>
          <button className="p-1 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-0.5" aria-label="Workspace navigation">
          {mainNav(workspace).map(navLink)}
        </nav>
        <p className="mb-1 mt-5 px-3 text-[12px] uppercase tracking-[0.08em] text-[#66666c]">
          Projects
        </p>
        <nav className="space-y-0.5" aria-label="Projects">
          {projectNav(workspace).map(navLink)}
        </nav>
        <p className="mb-1 mt-5 px-3 text-[12px] uppercase tracking-[0.08em] text-[#66666c]">
          Manage
        </p>
        <nav className="space-y-0.5" aria-label="Management">
          {manageNav(workspace).map(navLink)}
        </nav>
        <div className="mt-auto border-t border-[#ececf0] pt-4 lg:hidden">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-8 place-items-center rounded-full bg-[#eef0ff] text-[11px] font-semibold text-[#2721a6]">
              {workspace.initials}
            </span>
            <div>
              <p className="text-[13px] font-medium text-[#202024]">Morgan Ellis</p>
              <p className="text-[11px] text-[#77777d]">{workspace.switchLabel} workspace</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
