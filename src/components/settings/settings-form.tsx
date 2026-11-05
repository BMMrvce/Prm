'use client'

import { Settings } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useToast, useWorkspace } from '@/state/workbench-store'
import type { Currency } from '@/types/workbench'

const currencies: [Currency, string][] = [
  ['USD', 'USD — US Dollar'],
  ['EUR', 'EUR — Euro'],
  ['GBP', 'GBP — British Pound'],
  ['INR', 'INR — Indian Rupee'],
]

export function SettingsForm() {
  const {
    workspace,
    profile,
    ready,
    settings,
    saveSettings,
    renameWorkspace,
    updateProfileName,
    signOut,
  } = useWorkspace()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [currency, setCurrency] = useState<Currency>(settings.currency)
  const [saving, setSaving] = useState(false)

  // Fill the form once the workspace and profile have loaded from Supabase.
  useEffect(() => {
    if (ready) setName(workspace.name)
  }, [ready, workspace.name])
  useEffect(() => {
    if (profile) setFullName(profile.fullName)
  }, [profile])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      showToast('Workspace name needs at least 2 characters.', 3500)
      return
    }
    setSaving(true)
    const results = await Promise.all([
      trimmed !== workspace.name ? renameWorkspace(trimmed) : true,
      fullName.trim() && fullName.trim() !== profile?.fullName
        ? updateProfileName(fullName.trim())
        : true,
    ])
    saveSettings({ currency })
    setSaving(false)
    if (results.every(Boolean)) showToast('Settings saved.')
  }

  const input =
    'mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]'

  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={submit} className="neo-card rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[#493bd0]" />
          <div>
            <h3 className="font-semibold">Workspace settings</h3>
            <p className="text-xs text-[#77777d]">{workspace.switchLabel} workspace</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#55555c]">
            Workspace name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              disabled={!ready}
              className={input}
            />
          </label>
          <label className="text-xs font-medium text-[#55555c]">
            Your name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={!profile}
              className={input}
            />
          </label>
          <label className="text-xs font-medium text-[#55555c]">
            Currency for new expenses (this device)
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
              className={input}
            >
              {currencies.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={!ready || saving}
          className="mt-6 rounded-lg bg-[#493bd0] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#382bb9] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
      <section className="neo-card flex flex-wrap items-center gap-3 rounded-xl p-6">
        <div className="mr-auto min-w-0">
          <h3 className="font-semibold">Account</h3>
          <p className="truncate text-xs text-[#77777d]">Signed in as {profile?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg border border-[#d8d8dc] bg-white px-4 py-2 text-sm font-medium text-[#a52828]"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
