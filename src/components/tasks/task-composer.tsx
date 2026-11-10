'use client'

import { CalendarDays, Flag, FolderKanban, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DurationInput } from '@/components/ui/duration-input'
import { dayFromToday, dueAtFromDay, PRIORITIES, PRIORITY } from '@/lib/tasks'
import { useWorkspace } from '@/state/workbench-store'
import type { Priority } from '@/types/workbench'

const chipBase =
  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
const chipOff = 'border-line-strong bg-field text-ink-2 hover:border-primary/50 hover:text-ink'
const chipOn = 'border-primary/40 bg-primary-light text-primary-ink'

/**
 * Task creation: a title line (Enter adds) and option chips for due day, priority,
 * project and estimate. `inline` keeps the chips tucked away until the title has focus or
 * text; `full` always shows them (My Tasks, the New task dialog).
 */
export function TaskComposer({
  projectId,
  defaultDue = '',
  variant = 'inline',
  autoFocus = false,
  onAdded,
}: {
  /** Adds into this project and hides the project picker. */
  projectId?: string
  /** `YYYY-MM-DD` preselected due day, or '' for none. */
  defaultDue?: string
  variant?: 'inline' | 'full'
  autoFocus?: boolean
  onAdded?: () => void
}) {
  const { ready, workspace, projects, addTask } = useWorkspace()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(defaultDue)
  const [priority, setPriority] = useState<Priority>('none')
  const [project, setProject] = useState('')
  const [estimate, setEstimate] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(variant === 'full')
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Follows the default when the surrounding view changes it (e.g. Today → All tab).
  useEffect(() => setDue(defaultDue), [defaultDue])
  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  const today = dayFromToday(0)
  const tomorrow = dayFromToday(1)
  const showOptions = variant === 'full' || expanded || title.length > 0

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text || saving) return
    setSaving(true)
    const ok = await addTask({
      title: text,
      projectId: projectId ?? (project || undefined),
      priority,
      dueAt: dueAtFromDay(due),
      estimateMinutes: estimate,
    })
    setSaving(false)
    if (!ok) return
    setTitle('')
    setPriority('none')
    setEstimate(null)
    setDue(defaultDue)
    input.current?.focus()
    onAdded?.()
  }

  const ownProjects = projects.filter((item) => item.slug !== 'general')

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border bg-field ${
        showOptions ? 'border-primary/40 ring-2 ring-primary/10' : 'border-line-strong'
      }`}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false)
      }}
    >
      <div className="flex items-center gap-2 px-3">
        <Plus size={16} className="shrink-0 text-primary-ink" aria-hidden />
        <input
          ref={input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setTitle('')
              event.currentTarget.blur()
            }
          }}
          disabled={!ready}
          maxLength={300}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
          placeholder="Add a task…"
          aria-label="New task title"
        />
        <button
          type="submit"
          disabled={!ready || !title.trim() || saving}
          className="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
      {showOptions && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line-soft px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Due date">
            {[
              ['', 'No date'],
              [today, 'Today'],
              [tomorrow, 'Tomorrow'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={label}
                onClick={() => setDue(value)}
                aria-pressed={due === value}
                className={`${chipBase} ${due === value ? chipOn : chipOff}`}
              >
                {label}
              </button>
            ))}
            <label
              className={`${chipBase} cursor-pointer ${due && due !== today && due !== tomorrow ? chipOn : chipOff}`}
            >
              <CalendarDays size={13} aria-hidden />
              <input
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
                className="w-[7.5rem] bg-transparent text-xs outline-none [color-scheme:inherit]"
                aria-label="Due date"
              />
            </label>
          </div>
          <label className={`${chipBase} ${priority !== 'none' ? chipOn : chipOff}`}>
            <Flag size={13} className={PRIORITY[priority].flag} aria-hidden />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              className="bg-transparent text-xs outline-none"
              aria-label="Priority"
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY[value].label}
                </option>
              ))}
            </select>
          </label>
          {!projectId && workspace.key !== 'personal' && (
            <label className={`${chipBase} max-w-full ${project ? chipOn : chipOff}`}>
              <FolderKanban size={13} aria-hidden />
              <select
                value={project}
                onChange={(event) => setProject(event.target.value)}
                className="min-w-0 max-w-[12rem] truncate bg-transparent text-xs outline-none"
                aria-label="Project"
              >
                <option value="">General</option>
                {ownProjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.sharedBy ? ` (${item.sharedBy})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {variant === 'full' && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-xs text-ink-2">Estimate</span>
              <div className="w-[9.5rem]">
                <DurationInput value={estimate} onChange={setEstimate} label="Estimate" />
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
