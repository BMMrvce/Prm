'use client'

import {
  ArrowLeft,
  CalendarClock,
  FolderKanban,
  NotebookText,
  Pin,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMeetingCategories } from '@/components/calendar/use-meeting-categories'
import { mailDate } from '@/lib/format'
import { meetingStyle } from '@/lib/meetings'
import { htmlToText } from '@/lib/sanitize-html'
import { useWorkspace } from '@/state/workbench-store'
import { DailyReflections, TodayReflection } from './daily-reflections'
import { NoteEditor } from './note-editor'

type Filter = 'all' | 'meetings' | 'shared' | 'pinned'

/** Project filter: every note, notes without a project, or one project's id. */
const ALL = '__all'
const NONE = '__none'

/**
 * Notes: every page you have written in this workspace, including the notes of meetings
 * (opened from the calendar). `?note=<id>` selects one, so links can open a note directly.
 */
export function NotesView() {
  const { ready, workspace, notes, notesReady, notesCollab, addNote, profile, projects } = useWorkspace()
  const categories = useMeetingCategories()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const selectedId = params.get('note')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [projectFilter, setProjectFilter] = useState<string>(ALL)
  const [creating, setCreating] = useState(false)

  const open = (id: string | null) =>
    router.replace(id ? `${pathname}?note=${id}` : pathname, { scroll: false })

  const create = async () => {
    setCreating(true)
    // A new note joins the project being viewed.
    const note = await addNote({
      projectId: projectFilter !== ALL && projectFilter !== NONE ? projectFilter : null,
    })
    setCreating(false)
    if (note) open(note.id)
  }

  // Plain text of each note, for search and previews.
  const previews = useMemo(
    () => new Map(notes.map((note) => [note.id, htmlToText(note.content)])),
    [notes],
  )
  const term = query.trim().toLowerCase()
  const shown = notes.filter((note) => {
    if (filter === 'meetings' && !note.meetingId) return false
    if (filter === 'pinned' && !note.pinned) return false
    if (filter === 'shared' && !note.members.length && note.ownerId === profile?.id) return false
    if (projectFilter === NONE && note.projectId) return false
    if (projectFilter !== ALL && projectFilter !== NONE && note.projectId !== projectFilter) {
      return false
    }
    if (!term) return true
    return (
      note.title.toLowerCase().includes(term) ||
      (previews.get(note.id) ?? '').toLowerCase().includes(term) ||
      (note.meeting?.title ?? '').toLowerCase().includes(term)
    )
  })
  const selected = notes.find((note) => note.id === selectedId) ?? null

  // Project name and color by id (current, so recolored projects show right away).
  const projectOf = (id: string | null, fallback: { name: string; color: string } | null) => {
    const known = projects.find((item) => item.id === id)
    return known ? { name: known.name, color: known.color } : fallback
  }
  // Grouped by project when showing everything: each project, then notes without one.
  const groups = (() => {
    if (!notesCollab || projectFilter !== ALL)
      return [{ key: 'list', label: '', color: '', notes: shown }]
    const byProject = new Map<string, typeof shown>()
    for (const note of shown) {
      const key = note.projectId ?? NONE
      byProject.set(key, [...(byProject.get(key) ?? []), note])
    }
    return [...byProject.entries()]
      .map(([key, list]) => {
        const project = key === NONE ? null : projectOf(key, list[0].project)
        return {
          key,
          label: project?.name ?? 'No project',
          color: project?.color ?? '',
          notes: list,
        }
      })
      .sort((a, b) => (a.key === NONE ? 1 : b.key === NONE ? -1 : a.label.localeCompare(b.label)))
  })()
  // Projects that have notes, for the filter (plus every project of yours).
  const projectChoices = projects.filter(
    (item) => notes.some((note) => note.projectId === item.id) || item.sharedBy === null,
  )

  if (ready && !notesReady) {
    return (
      <div className="neo-card max-w-2xl rounded-xl p-6">
        <h3 className="font-semibold">Notes need a quick database update</h3>
        <p className="mt-2 text-sm text-ink-2">
          Run{' '}
          <code className="rounded bg-surface-2 px-1">
            supabase/migrations/202611070001_notes.sql
          </code>{' '}
          in the Supabase SQL editor (Project → SQL Editor → paste → Run), then reload this page. It
          only adds a new <code className="rounded bg-surface-2 px-1">notes</code> table.
        </p>
      </div>
    )
  }

  return (
    <div>
      {workspace.key === 'personal' && (
        <>
          <TodayReflection />
          <DailyReflections />
        </>
      )}
      <div className="grid min-h-[calc(100dvh-10rem)] min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section
        className={`neo-card min-w-0 flex-col overflow-hidden rounded-xl ${selected ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="space-y-3 border-b border-line p-3">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 w-full rounded-lg border border-line-strong bg-field pl-8 pr-7 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Search notes"
                aria-label="Search notes"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-3 hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => void create()}
              disabled={!ready || creating}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50"
            >
              <Plus size={14} /> New
            </button>
          </div>
          {notesCollab && workspace.key !== 'personal' && (
            <label className="relative flex items-center">
              <FolderKanban
                size={13}
                className="pointer-events-none absolute left-2.5 text-ink-3"
                aria-hidden
              />
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className={`h-8 w-full rounded-lg border bg-field pl-7 pr-2 text-xs outline-none focus:border-primary ${
                  projectFilter === ALL
                    ? 'border-line-strong text-ink-2'
                    : 'border-primary/50 text-primary-ink'
                }`}
                aria-label="Project"
              >
                <option value={ALL}>All projects</option>
                {projectChoices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.sharedBy ? ` (${item.sharedBy})` : ''}
                  </option>
                ))}
                <option value={NONE}>No project</option>
              </select>
            </label>
          )}
          <div
            className={`grid rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-medium ${notesCollab ? 'grid-cols-4' : 'grid-cols-3'}`}
            role="tablist"
            aria-label="Show"
          >
            {(
              [
                ['all', 'All'],
                ['meetings', 'Meetings'],
                ...(notesCollab ? ([['shared', 'Shared']] as const) : []),
                ['pinned', 'Pinned'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={filter === value}
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md py-1.5 ${filter === value ? 'bg-segment text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {ready && !notesCollab && (
          <p className="border-b border-line bg-surface-2 px-3 py-2 text-2xs text-ink-2">
            Projects and sharing for notes need{' '}
            <code className="rounded bg-surface px-1">
              202611080001_notes_projects_collaboration.sql
            </code>{' '}
            in the Supabase SQL editor.
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {!ready && (
            <div className="space-y-2 p-2" aria-hidden>
              {[0, 1, 2].map((row) => (
                <div key={row} className="skeleton h-14 rounded-lg" />
              ))}
            </div>
          )}
          {ready && !shown.length && (
            <p className="px-4 py-10 text-center text-sm text-ink-3">
              {term
                ? 'No notes match.'
                : filter === 'meetings'
                  ? 'No meeting notes yet. Open a meeting on the calendar and choose Notes.'
                  : filter === 'pinned'
                    ? 'Pin a note to keep it on top.'
                    : filter === 'shared'
                      ? 'No shared notes. Open a note and use Share to work on it together.'
                      : projectFilter !== ALL
                        ? 'No notes here yet. New creates one in this project.'
                        : 'No notes yet. Create one with New.'}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.key} className="mb-1">
              {group.label && (
                <p className="flex items-center gap-2 px-3 pb-1 pt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">
                  {group.color ? (
                    <span
                      className="size-2.5 rounded-[3px]"
                      style={{ background: group.color }}
                      aria-hidden
                    />
                  ) : (
                    <FolderKanban size={12} aria-hidden />
                  )}
                  <span className="truncate">{group.label}</span>
                  <span className="font-medium text-ink-3">{group.notes.length}</span>
                </p>
              )}
              {group.notes.map((note) => {
                const style = note.meeting
                  ? meetingStyle({ title: note.meeting.title, location: null }, categories)
                  : null
                const preview = previews.get(note.id) ?? ''
                return (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => open(note.id)}
                    aria-current={note.id === selectedId ? 'true' : undefined}
                    className="animate-row block w-full rounded-lg px-3 py-2.5 text-left hover:bg-surface-2 aria-[current]:bg-primary-light"
                  >
                    <span className="flex items-center gap-1.5">
                      {note.pinned && <Pin size={12} className="shrink-0 text-primary-ink" />}
                      {style && (
                        <span className={`size-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">
                        {note.title || 'Untitled'}
                      </span>
                      <span className="shrink-0 text-2xs text-ink-3">
                        {mailDate(note.updatedAt)}
                      </span>
                    </span>
                    {note.meeting && (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-2xs text-ink-2">
                        <CalendarClock size={11} className="shrink-0" />
                        {new Date(note.meeting.startsAt).toLocaleDateString([], {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                    <span className="mt-0.5 line-clamp-2 text-xs text-ink-2">
                      {preview || 'No content yet'}
                    </span>
                    {(note.members.length > 0 || note.ownerId !== profile?.id) && (
                      <span className="mt-1 flex items-center gap-1 text-2xs font-medium text-primary-ink">
                        <Users size={11} />
                        {note.ownerId !== profile?.id
                          ? 'Shared with you'
                          : `Shared with ${note.members.length}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      <section
        className={`neo-card min-w-0 flex-col overflow-hidden rounded-xl ${selected ? 'flex' : 'hidden lg:flex'}`}
      >
        {selected ? (
          <>
            <div className="border-b border-line px-3 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => open(null)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-ink"
              >
                <ArrowLeft size={14} /> All notes
              </button>
            </div>
            {/* Keyed so each note gets a fresh editor (and the previous one saves on leave). */}
            <NoteEditor key={selected.id} note={selected} onDeleted={() => open(null)} />
          </>
        ) : (
          <div className="m-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary-light text-primary-ink">
              <NotebookText size={22} />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">
              {notes.length ? 'Pick a note, or start a new one' : 'Your first note'}
            </p>
            <p className="mt-1 text-xs text-ink-2">
              Type <kbd className="rounded border border-line-strong px-1 font-sans">/</kbd> inside
              a note for to-dos, headings, yellow text, highlights and more.
            </p>
            <button
              type="button"
              onClick={() => void create()}
              disabled={!ready || creating}
              className="mt-4 flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus size={15} /> New note
            </button>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
