'use client'

import { Check, Plus, RotateCcw, Tags, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PanelHeader } from '@/components/ui/panel'
import { CATEGORY_COLORS, COLOR_NAMES, DEFAULT_CATEGORIES, MAX_CATEGORIES } from '@/lib/meetings'
import { useToast, useWorkspace } from '@/state/workbench-store'
import type { CategoryColor, MeetingCategoryConfig } from '@/types/workbench'

/** Editable row: keywords as the comma-separated text the input shows. */
type Row = { id: string; label: string; keywords: string; color: CategoryColor }

const toRows = (configs: MeetingCategoryConfig[]): Row[] =>
  configs.map((config) => ({ ...config, keywords: config.keywords.join(', ') }))

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/**
 * Settings → Meeting colors: the people or entities whose meetings get their own calendar
 * color in this workspace. A meeting matches when its title or location names the label or
 * one of the extra words. Saved to the account, per workspace.
 */
export function MeetingColors() {
  const { workspace, settings, saveSettings } = useWorkspace()
  const { showToast } = useToast()
  const saved = settings.meetingCategories
  const [rows, setRows] = useState<Row[]>(() => toRows(saved ?? DEFAULT_CATEGORIES))
  const [dirty, setDirty] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Settings arrive with the account after the first render; adopt them unless editing.
  useEffect(() => {
    if (!dirty) setRows(toRows(saved ?? DEFAULT_CATEGORIES))
  }, [saved, dirty])

  const change = (id: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setDirty(true)
  }

  const add = () => {
    // Start with the first color no row uses yet.
    const used = new Set(rows.map((row) => row.color))
    const color = COLOR_NAMES.find((name) => !used.has(name)) ?? 'slate'
    const id = newId()
    setRows((current) => [...current, { id, label: '', keywords: '', color }])
    setDirty(true)
    // Focus the new name field once it renders.
    window.setTimeout(() => document.getElementById(`category-${id}`)?.focus(), 0)
  }

  const remove = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id))
    setDirty(true)
  }

  const save = async () => {
    const configs: MeetingCategoryConfig[] = rows.map((row) => ({
      id: row.id,
      label: row.label.trim(),
      keywords: row.keywords
        .split(',')
        .map((word) => word.trim())
        .filter(Boolean),
      color: row.color,
    }))
    if (configs.some((config) => !config.label)) {
      showToast('Give every category a name, or remove the empty row.', 4000)
      return
    }
    const labels = configs.map((config) => config.label.toLowerCase())
    if (new Set(labels).size !== labels.length) {
      showToast('Two categories have the same name.', 4000)
      return
    }
    setSaving(true)
    const ok = await saveSettings({ meetingCategories: configs })
    setSaving(false)
    if (ok) {
      setDirty(false)
      showToast('Meeting colors saved.')
    }
  }

  const field =
    'h-9 w-full min-w-0 rounded-lg border border-line-strong bg-field px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <section id="meeting-colors" className="neo-card scroll-mt-6 rounded-xl p-6">
      <PanelHeader
        icon={Tags}
        title="Meeting colors"
        subtitle={`People and entities whose meetings get their own color in ${workspace.name}`}
      />
      <p className="mt-3 text-xs text-ink-2">
        A meeting takes a color when its title or location contains the name or one of the extra
        words, as a whole word (any capitalization). Meetings that match none stay grey.
      </p>

      <div className="mt-5 space-y-2">
        {rows.map((row) => {
          const color = CATEGORY_COLORS[row.color]
          return (
            <div key={row.id} className="rounded-lg border border-line bg-surface-2/50 p-2.5">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <button
                  type="button"
                  onClick={() => setPicking((current) => (current === row.id ? null : row.id))}
                  aria-expanded={picking === row.id}
                  aria-label={`Color for ${row.label || 'new category'}: ${color.name}. Change`}
                  title="Change color"
                  className="grid size-9 place-items-center rounded-lg border border-line-strong bg-field hover:border-primary/50"
                >
                  <span className={`size-4 rounded-full ${color.dot}`} />
                </button>
                <input
                  id={`category-${row.id}`}
                  value={row.label}
                  onChange={(event) => change(row.id, { label: event.target.value })}
                  maxLength={40}
                  className={field}
                  placeholder="Name, e.g. Arjun"
                  aria-label="Category name"
                />
                <input
                  value={row.keywords}
                  onChange={(event) => change(row.id, { keywords: event.target.value })}
                  maxLength={160}
                  className={`${field} order-last col-span-3 sm:order-none sm:col-span-1`}
                  placeholder="Also matches (comma-separated, optional)"
                  aria-label={`Other words for ${row.label || 'this category'}`}
                />
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-error-light hover:text-error-ink"
                  aria-label={`Remove ${row.label || 'this category'}`}
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {picking === row.id && (
                <div
                  className="animate-pop mt-2 flex flex-wrap gap-1.5"
                  role="radiogroup"
                  aria-label="Color"
                >
                  {COLOR_NAMES.map((name) => {
                    const option = CATEGORY_COLORS[name]
                    const on = row.color === name
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        key={name}
                        onClick={() => {
                          change(row.id, { color: name })
                          setPicking(null)
                        }}
                        className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${
                          on ? option.tab : 'border-line-strong bg-field text-ink-2 hover:text-ink'
                        }`}
                      >
                        <span
                          className={`grid size-3.5 place-items-center rounded-full ${option.dot}`}
                        >
                          {on && <Check size={9} strokeWidth={3.5} className="text-surface" />}
                        </span>
                        {option.name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* What a matching meeting looks like on the calendar. */}
              {row.label.trim() && (
                <p className="mt-2 flex items-center gap-2 text-2xs text-ink-3">
                  Preview
                  <span
                    className={`inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 ${color.chip}`}
                  >
                    <span className={`size-1.5 shrink-0 rounded-full ${color.dot}`} aria-hidden />
                    <span className="truncate font-medium">Sync with {row.label.trim()}</span>
                  </span>
                </p>
              )}
            </div>
          )
        })}
        {!rows.length && (
          <p className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-center text-xs text-ink-2">
            No categories. Every meeting in {workspace.name} shows grey on the calendar.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= MAX_CATEGORIES}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:border-primary/50 disabled:opacity-50"
        >
          <Plus size={15} /> Add person or entity
        </button>
        <button
          type="button"
          onClick={() => {
            setRows(toRows(DEFAULT_CATEGORIES))
            setDirty(true)
          }}
          className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <RotateCcw size={14} /> Reset to defaults
        </button>
        <span className="ml-auto text-xs text-ink-3">
          {rows.length}/{MAX_CATEGORIES}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save colors'}
        </button>
      </div>
    </section>
  )
}
