'use client'

import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckSquare,
  CornerDownLeft,
  FileText,
  FolderKanban,
  Mail,
  MoonStar,
  NotebookPen,
  PenSquare,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMeetingsAhead } from '@/components/calendar/use-meetings-ahead'
import { SPACE_KEYS, spaces } from '@/data/workspaces'
import { timeOfDay } from '@/lib/format'
import { mainNav, manageNav, projectPath, workspacePath } from '@/lib/routes'
import { htmlToText } from '@/lib/sanitize-html'
import { dueBucket } from '@/lib/tasks'
import { useTheme } from '@/lib/theme'
import { useWorkspace } from '@/state/workbench-store'
import type { Meeting } from '@/types/workbench'

type Group =
  | 'Actions'
  | 'Tasks'
  | 'Notes'
  | 'Meetings'
  | 'Projects'
  | 'Pages'
  | 'Workspaces'
  | 'Mail'
// Matches first; searching the mailbox is the fallback at the end.
const GROUP_ORDER: Group[] = [
  'Actions',
  'Tasks',
  'Notes',
  'Meetings',
  'Projects',
  'Pages',
  'Workspaces',
  'Mail',
]
const PER_GROUP: Partial<Record<Group, number>> = { Tasks: 6, Notes: 6, Meetings: 5 }

type Item = {
  id: string
  group: Group
  title: string
  subtitle?: string
  icon: LucideIcon
  /** Swatch color (projects). */
  color?: string
  /** Extra text that matches but is not shown (codes, content). */
  keywords?: string
  run: () => void
}

/**
 * Relevance of `item` for the typed words: every word must appear somewhere; matches at the
 * start of the title count most, then at a word start, then anywhere, then in the details.
 */
function score(item: Item, words: string[]) {
  const title = item.title.toLowerCase()
  const rest = `${item.subtitle ?? ''} ${item.keywords ?? ''}`.toLowerCase()
  let total = 0
  for (const word of words) {
    if (title.startsWith(word)) total += 100
    else if (
      new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(
        title,
      )
    )
      total += 70
    else if (title.includes(word)) total += 45
    else if (rest.includes(word)) total += 15
    else return 0
  }
  return total
}

/** The title with the first typed word highlighted. */
function highlight(text: string, words: string[]): ReactNode {
  const lower = text.toLowerCase()
  const word = words.find((item) => lower.includes(item))
  if (!word) return text
  const at = lower.indexOf(word)
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-primary-light px-0.5 text-primary-ink">
        {text.slice(at, at + word.length)}
      </mark>
      {text.slice(at + word.length)}
    </>
  )
}

/** A short excerpt of `text` around the first typed word (for note bodies). */
function snippet(text: string, words: string[]) {
  const lower = text.toLowerCase()
  const word = words.find((item) => lower.includes(item))
  if (!word) return text.slice(0, 90)
  const at = lower.indexOf(word)
  const start = Math.max(0, at - 30)
  return `${start ? '…' : ''}${text.slice(start, at + 70).replace(/\s+/g, ' ')}…`
}

/**
 * Alt+S (or Ctrl/⌘+K, or /) search across the whole workspace: actions, tasks, notes (full
 * text), meetings, projects, pages and other workspaces, plus a jump into mail search.
 * Arrow keys move, Enter opens, Esc closes.
 */
export function CommandPalette({
  onClose,
  onNewTask,
  onOpenTask,
  onOpenMeeting,
}: {
  onClose: () => void
  onNewTask: () => void
  onOpenTask: (id: string) => void
  onOpenMeeting: (meeting: Meeting) => void
}) {
  const { workspace, projects, tasks, notes, meetings, notesReady, addNote } = useWorkspace()
  const theme = useTheme()
  const router = useRouter()
  useMeetingsAhead()
  const dialog = useRef<HTMLDialogElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  const go = (href: string) => {
    onClose()
    router.push(href)
  }
  const path = (...segments: string[]) => workspacePath(workspace.key, ...segments)

  // Plain text of every note, computed once per change, for full-text search.
  const noteText = useMemo(
    () => new Map(notes.map((note) => [note.id, htmlToText(note.content)])),
    [notes],
  )

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  const items = useMemo(() => {
    const all: Item[] = [
      {
        id: 'new-task',
        group: 'Actions',
        title: 'New task',
        subtitle: 'N',
        icon: Plus,
        keywords: 'add create todo',
        run: () => {
          onClose()
          onNewTask()
        },
      },
      ...(notesReady
        ? [
            {
              id: 'new-note',
              group: 'Actions' as const,
              title: 'New note',
              icon: NotebookPen,
              keywords: 'add create write page',
              run: async () => {
                onClose()
                const note = await addNote()
                if (note) router.push(`${path('notes')}?note=${note.id}`)
              },
            },
          ]
        : []),
      {
        id: 'compose',
        group: 'Actions',
        title: 'Compose email',
        icon: PenSquare,
        keywords: 'mail write send new message',
        run: () => go(`${path('inbox')}?compose=1`),
      },
      {
        id: 'theme',
        group: 'Actions',
        title: theme.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        icon: MoonStar,
        keywords: 'theme appearance dark light',
        run: () => {
          theme.toggle()
          onClose()
        },
      },
      ...[...mainNav(workspace), ...manageNav(workspace)].map((page) => ({
        id: `page-${page.href}`,
        group: 'Pages' as const,
        title: page.label,
        subtitle: `${workspace.name} workspace`,
        icon: ArrowRight,
        run: () => go(page.href),
      })),
      ...SPACE_KEYS.filter((key) => key !== workspace.key).map((key) => ({
        id: `space-${key}`,
        group: 'Workspaces' as const,
        title: `Go to ${spaces[key].switchLabel}`,
        subtitle: 'Switch workspace',
        icon: Briefcase,
        keywords: 'workspace switch',
        run: () => go(workspacePath(key)),
      })),
      ...projects.map((project) => ({
        id: `project-${project.id}`,
        group: 'Projects' as const,
        title: project.name,
        subtitle: project.sharedBy ? `Shared by ${project.sharedBy}` : 'Project',
        icon: FolderKanban,
        color: project.color,
        run: () => go(projectPath(workspace.key, project)),
      })),
      ...tasks
        .filter((task) => task.state !== 'cancelled')
        .map((task) => ({
          id: `task-${task.id}`,
          group: 'Tasks' as const,
          title: task.title,
          subtitle: [
            task.code,
            task.projectName,
            task.state === 'completed'
              ? 'Done'
              : task.dueAt
                ? `Due ${new Date(task.dueAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
                : null,
          ]
            .filter(Boolean)
            .join(' · '),
          icon: CheckSquare,
          keywords: `${task.code} ${task.projectName ?? ''} ${task.priority}`,
          run: () => {
            onClose()
            onOpenTask(task.id)
          },
        })),
      ...notes.map((note) => ({
        id: `note-${note.id}`,
        group: 'Notes' as const,
        title: note.title || 'Untitled note',
        subtitle: noteText.get(note.id) ?? '',
        icon: note.meetingId ? CalendarClock : FileText,
        keywords: `${note.project?.name ?? ''} ${note.meeting?.title ?? ''}`,
        run: () => go(`${path('notes')}?note=${note.id}`),
      })),
      ...meetings.map((meeting) => ({
        id: `meeting-${meeting.id}`,
        group: 'Meetings' as const,
        title: meeting.title,
        subtitle: `${new Date(meeting.startsAt).toLocaleDateString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })} · ${timeOfDay(meeting.startsAt)}`,
        icon: CalendarClock,
        keywords: meeting.location ?? '',
        run: () => {
          onClose()
          onOpenMeeting(meeting)
        },
      })),
    ]

    if (!words.length) {
      // Nothing typed: actions, what is due today, recent notes, then the pages.
      const now = new Date()
      const today = new Set(
        tasks
          .filter((task) => task.state === 'open')
          .filter((task) => ['overdue', 'today'].includes(dueBucket(task, now)))
          .slice(0, 4)
          .map((task) => `task-${task.id}`),
      )
      const recent = new Set(notes.slice(0, 3).map((note) => `note-${note.id}`))
      return all
        .filter(
          (item) =>
            item.group === 'Actions' ||
            item.group === 'Pages' ||
            today.has(item.id) ||
            recent.has(item.id),
        )
        .map((item) =>
          item.group === 'Notes' ? { ...item, subtitle: item.subtitle?.slice(0, 80) } : item,
        )
    }

    const scored = all
      .map((item) => ({ item, score: score(item, words) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
    const counts = new Map<Group, number>()
    const picked = scored
      .filter(({ item }) => {
        const count = counts.get(item.group) ?? 0
        if (count >= (PER_GROUP[item.group] ?? 6)) return false
        counts.set(item.group, count + 1)
        return true
      })
      .map(({ item }) =>
        item.group === 'Notes' ? { ...item, subtitle: snippet(item.subtitle ?? '', words) } : item,
      )
    // Always offer to search the mailbox for the typed words.
    picked.push({
      id: 'mail-search',
      group: 'Mail',
      title: `Search mail for “${query.trim()}”`,
      subtitle: 'Opens the inbox with this search',
      icon: Mail,
      run: () => go(`${path('inbox')}?search=${encodeURIComponent(query.trim())}`),
    })
    return picked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, workspace, projects, tasks, notes, meetings, noteText, notesReady, theme.resolved])

  // Grouped in a fixed order; `ordered` is the keyboard order.
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length)
  const ordered = groups.flatMap((entry) => entry.items)

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose()
      }}
      aria-label="Search"
      className="modal-dialog mx-auto mb-auto mt-[10vh] w-[min(660px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-elevated p-0 text-ink shadow-[var(--popover-shadow)] backdrop:bg-scrim"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={18} className="shrink-0 text-ink-3" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              const step = event.key === 'ArrowDown' ? 1 : -1
              setActive((index) => (index + step + ordered.length) % Math.max(1, ordered.length))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              ordered[active]?.run()
            }
          }}
          placeholder="Search tasks, notes, meetings, projects, pages…"
          aria-label="Search everything"
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
        />
        <kbd className="hidden shrink-0 rounded border border-line-strong px-1.5 font-sans text-2xs text-ink-3 sm:inline">
          Esc
        </kbd>
      </div>

      <div ref={list} className="max-h-[min(60vh,520px)] overflow-y-auto p-2" role="listbox">
        {!ordered.length && (
          <p className="px-3 py-10 text-center text-sm text-ink-3">Nothing matches.</p>
        )}
        {(() => {
          let index = -1
          return groups.map((entry) => (
            <div key={entry.group} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                {entry.group}
              </p>
              {entry.items.map((item) => {
                index += 1
                const position = index
                const selected = position === active
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-index={position}
                    key={item.id}
                    onMouseMove={() => setActive(position)}
                    onClick={() => item.run()}
                    className={`flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left ${
                      selected ? 'bg-primary-light' : ''
                    }`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        selected ? 'bg-surface text-primary-ink' : 'bg-surface-2 text-ink-2'
                      }`}
                    >
                      {item.color ? (
                        <span
                          className="size-3 rounded-[4px]"
                          style={{ background: item.color }}
                          aria-hidden
                        />
                      ) : (
                        <item.icon size={15} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {highlight(item.title, words)}
                      </span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-ink-2">{item.subtitle}</span>
                      )}
                    </span>
                    {selected && (
                      <CornerDownLeft size={14} className="shrink-0 text-primary-ink" aria-hidden />
                    )}
                  </button>
                )
              })}
            </div>
          ))
        })()}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-2xs text-ink-3">
        <span>
          <kbd className="font-sans">↑↓</kbd> move
        </span>
        <span>
          <kbd className="font-sans">↵</kbd> open
        </span>
        <span>
          <kbd className="font-sans">Esc</kbd> close
        </span>
        <span className="ml-auto">
          <kbd className="rounded border border-line-strong px-1 font-sans">Alt</kbd> +{' '}
          <kbd className="rounded border border-line-strong px-1 font-sans">S</kbd> anywhere
        </span>
      </div>
    </dialog>
  )
}
