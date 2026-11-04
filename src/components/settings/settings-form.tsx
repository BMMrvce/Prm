import { Settings } from 'lucide-react'
import type { WorkspaceData } from '@/types/workbench'

export function SettingsForm({ workspace }: { workspace: WorkspaceData }) {
  return (
    <section className="neo-card max-w-3xl rounded-xl p-6">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-[#493bd0]" />
        <div>
          <h3 className="font-semibold">Workspace settings</h3>
          <p className="text-xs text-[#77777d]">Manage identity and preferences</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#55555c]">
          Workspace name
          <input
            defaultValue={workspace.name}
            className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-[#55555c]">
          Default currency
          <select className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm">
            <option>USD — US Dollar</option>
            <option>EUR — Euro</option>
            <option>GBP — British Pound</option>
          </select>
        </label>
      </div>
      <button className="mt-6 rounded-lg bg-[#493bd0] px-4 py-2.5 text-sm font-medium text-white">
        Save changes
      </button>
    </section>
  )
}
