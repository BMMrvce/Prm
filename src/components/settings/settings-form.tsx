'use client'

import { Palette, Settings } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { ThemePicker } from '@/components/shell/theme-controls'
import { categoriesEnabled } from '@/lib/meetings'
import { useToast, useWorkspace } from '@/state/workbench-store'
import type { Currency } from '@/types/workbench'
import { MeetingColors } from './meeting-colors'
import { ProjectColors } from './project-colors'

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
  // Settings load with the account, after the first render.
  useEffect(() => setCurrency(settings.currency), [settings.currency])
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
    results.push(currency === settings.currency ? true : await saveSettings({ currency }))
    setSaving(false)
    if (results.every(Boolean)) showToast('Settings saved.')
  }

  const input =
    'mt-2 h-10 w-full rounded-lg border border-line-strong bg-field px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={submit} className="neo-card rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-primary-ink" />
          <div>
            <h3 className="font-semibold">Workspace settings</h3>
            <p className="text-xs text-ink-2">{workspace.switchLabel} workspace</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-ink-2">
            Workspace name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              disabled={!ready}
              className={input}
            />
          </label>
          <label className="text-xs font-medium text-ink-2">
            Your name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={!profile}
              className={input}
            />
          </label>
          <label className="text-xs font-medium text-ink-2">
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
          className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
      <section className="neo-card rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Palette size={20} className="text-primary-ink" />
          <div>
            <h3 className="font-semibold">Appearance</h3>
            <p className="text-xs text-ink-2">
              Light or dark theme for this browser. System follows your device setting.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <ThemePicker size="md" />
        </div>
      </section>
      {categoriesEnabled(workspace.key) && <MeetingColors />}
      <ProjectColors />
      <section className="neo-card flex flex-wrap items-center gap-3 rounded-xl p-6">
        <div className="mr-auto min-w-0">
          <h3 className="font-semibold">Account</h3>
          <p className="truncate text-xs text-ink-2">Signed in as {profile?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-error-ink"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
