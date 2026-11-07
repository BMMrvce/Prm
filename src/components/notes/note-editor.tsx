'use client'

import {
  CalendarClock,
  CalendarDays,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  List,
  ListChecks,
  ListOrdered,
  Megaphone,
  Minus,
  Palette,
  Pilcrow,
  Pin,
  PinOff,
  Quote,
  Trash2,
  Users,
  LogOut,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMeetingCategories } from '@/components/calendar/use-meeting-categories'
import { PeoplePicker } from '@/components/people/people-picker'
import { initials } from '@/lib/format'
import { meetingStyle } from '@/lib/meetings'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { useWorkspace } from '@/state/workbench-store'
import type { Note } from '@/types/workbench'
import { blocksOf, caretBlock, mergeBlocks, normalizeBlocks, snapshot } from './blocks'
import { useNoteLive, type Blocks } from './use-note-live'

/* ---------------------------------------------------------------- block helpers */

const BLOCKS = 'p,div,h1,h2,h3,blockquote,pre,li'
const COLOR_CLASSES = [
  'nc-yellow',
  'nc-orange',
  'nc-red',
  'nc-green',
  'nc-blue',
  'nc-purple',
  'nc-pink',
  'nc-hl-yellow',
  'nc-hl-green',
  'nc-hl-blue',
  'nc-hl-pink',
  'nc-callout',
]

/** The block (paragraph, heading, list item…) holding the caret, wrapping bare text first. */
function blockAtCaret(root: HTMLElement): HTMLElement | null {
  const selection = document.getSelection()
  let node = selection?.anchorNode ?? null
  if (!node || !root.contains(node)) return null
  if (node === root || node.parentNode === root) {
    // Text typed straight into the editor: give it a paragraph so it can be styled.
    if (node.nodeType === Node.TEXT_NODE || node === root) {
      document.execCommand('formatBlock', false, 'p')
      node = document.getSelection()?.anchorNode ?? null
      if (!node) return null
    }
  }
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const block = element?.closest(BLOCKS) as HTMLElement | null
  return block && block !== root && root.contains(block) ? block : null
}

function styleBlock(root: HTMLElement, className: string | null) {
  const block = blockAtCaret(root)
  if (!block) return
  block.classList.remove(...COLOR_CLASSES)
  if (className) block.classList.add(className)
  if (!block.classList.length) block.removeAttribute('class')
}

/** Turns the list at the caret into a to-do list (making one first if needed). */
function makeTodo(root: HTMLElement) {
  let block = blockAtCaret(root)
  if (!block?.closest('ul')) {
    document.execCommand('insertUnorderedList')
    block = blockAtCaret(root)
  }
  const list = block?.closest('ul')
  if (!list || !root.contains(list)) return
  list.setAttribute('data-type', 'todo')
  list.querySelectorAll(':scope > li').forEach((item) => {
    if (!item.hasAttribute('data-checked')) item.setAttribute('data-checked', 'false')
  })
}

function format(tag: string) {
  document.execCommand('formatBlock', false, tag)
}

type Command = {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  /** Extra words that find the command. */
  keywords?: string
  /** Swatch class for color commands. */
  swatch?: string
  run: (root: HTMLElement) => void
}

const COMMANDS: Command[] = [
  {
    id: 'text',
    label: 'Text',
    hint: 'Plain paragraph',
    icon: Pilcrow,
    keywords: 'paragraph plain normal',
    run: (root) => {
      format('p')
      styleBlock(root, null)
    },
  },
  {
    id: 'todo',
    label: 'To-do list',
    hint: 'Checklist with tick boxes',
    icon: ListChecks,
    keywords: 'checkbox check task todo',
    run: makeTodo,
  },
  {
    id: 'h1',
    label: 'Heading 1',
    hint: 'Big section title',
    icon: Heading1,
    keywords: 'title h1',
    run: () => format('h1'),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'Medium heading',
    icon: Heading2,
    keywords: 'subtitle h2',
    run: () => format('h2'),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'Small heading',
    icon: Heading3,
    keywords: 'h3',
    run: () => format('h3'),
  },
  {
    id: 'bullet',
    label: 'Bulleted list',
    hint: 'Simple list',
    icon: List,
    keywords: 'ul unordered',
    run: () => document.execCommand('insertUnorderedList'),
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    hint: '1, 2, 3',
    icon: ListOrdered,
    keywords: 'ol ordered',
    run: () => document.execCommand('insertOrderedList'),
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'Indented quotation',
    icon: Quote,
    keywords: 'blockquote',
    run: () => format('blockquote'),
  },
  {
    id: 'code',
    label: 'Code',
    hint: 'Monospaced block',
    icon: Code2,
    keywords: 'pre snippet',
    run: () => format('pre'),
  },
  {
    id: 'callout',
    label: 'Callout',
    hint: 'Tinted note box',
    icon: Megaphone,
    keywords: 'note info box',
    run: (root) => {
      format('p')
      styleBlock(root, 'nc-callout')
    },
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'Horizontal line',
    icon: Minus,
    keywords: 'hr line separator',
    run: () => document.execCommand('insertHTML', false, '<hr><p><br></p>'),
  },
  {
    id: 'date',
    label: 'Today’s date',
    hint: 'Insert the date',
    icon: CalendarDays,
    keywords: 'today now',
    run: () =>
      document.execCommand(
        'insertText',
        false,
        new Date().toLocaleDateString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      ),
  },
  ...(
    [
      ['yellowtext', 'Yellow text', 'nc-yellow'],
      ['orangetext', 'Orange text', 'nc-orange'],
      ['redtext', 'Red text', 'nc-red'],
      ['greentext', 'Green text', 'nc-green'],
      ['bluetext', 'Blue text', 'nc-blue'],
      ['purpletext', 'Purple text', 'nc-purple'],
      ['pinktext', 'Pink text', 'nc-pink'],
    ] as const
  ).map(([id, label, className]) => ({
    id,
    label,
    hint: 'Color this line',
    icon: Palette,
    keywords: `color colour ${id.replace('text', '')}`,
    swatch: className,
    run: (root: HTMLElement) => styleBlock(root, className),
  })),
  ...(
    [
      ['highlight', 'Yellow highlight', 'nc-hl-yellow', 'yellowhighlight marker'],
      ['greenhighlight', 'Green highlight', 'nc-hl-green', 'mark'],
      ['bluehighlight', 'Blue highlight', 'nc-hl-blue', 'mark'],
      ['pinkhighlight', 'Pink highlight', 'nc-hl-pink', 'mark'],
    ] as const
  ).map(([id, label, className, keywords]) => ({
    id,
    label,
    hint: 'Highlight this line',
    icon: Highlighter,
    keywords: `highlight background ${keywords}`,
    swatch: className,
    run: (root: HTMLElement) => styleBlock(root, className),
  })),
]

function matching(query: string) {
  const q = query.toLowerCase()
  if (!q) return COMMANDS
  return COMMANDS.filter(
    (command) =>
      command.id.startsWith(q) ||
      command.label.toLowerCase().includes(q) ||
      (command.keywords ?? '').includes(q),
  )
}

/** "/query" right before the caret, at the start of a line or after a space. */
function slashAtCaret(root: HTMLElement) {
  const selection = document.getSelection()
  if (!selection?.isCollapsed || !selection.anchorNode) return null
  const node = selection.anchorNode
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null
  const before = (node.textContent ?? '').slice(0, selection.anchorOffset)
  const match = /(?:^|[\s ])\/([a-z]{0,20})$/i.exec(before)
  if (!match) return null
  return {
    node: node as Text,
    start: selection.anchorOffset - match[1].length - 1,
    query: match[1],
  }
}

/** Markdown-style shortcuts typed at the start of a line, e.g. "[] " for a to-do. */
const SHORTCUTS: [RegExp, (root: HTMLElement) => void][] = [
  [/^\[ ?\]$/, makeTodo],
  [/^[-*]$/, () => document.execCommand('insertUnorderedList')],
  [/^1\.$/, () => document.execCommand('insertOrderedList')],
  [/^#$/, () => format('h1')],
  [/^##$/, () => format('h2')],
  [/^###$/, () => format('h3')],
  [/^>$/, () => format('blockquote')],
]

/* ---------------------------------------------------------------- component */

type Menu = { query: string; top: number; left: number; node: Text; start: number }

/**
 * One note: title, meeting link (if any), and a rich body with slash commands. Saves itself
 * a moment after you stop typing, and when you leave the note.
 */
export function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const {
    profile,
    projects,
    isOwn,
    notesCollab,
    personName,
    updateNote,
    deleteNote,
    patchNoteLocal,
    shareNote,
    unshareNote,
  } = useWorkspace()
  const categories = useMeetingCategories()
  const root = useRef<HTMLDivElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const [sharing, setSharing] = useState(false)
  /** Bumped when blocks move, so collaborators' markers are re-positioned. */
  const [, setLayout] = useState(0)
  const lastSaved = useRef(note.content)
  const owner = note.ownerId === profile?.id
  const shared = owner ? note.members.length > 0 : true

  const live = useNoteLive({
    noteId: note.id,
    enabled: notesCollab && shared,
    me: profile ? { id: profile.id, name: profile.fullName || profile.email } : null,
    currentBlocks: () => (root.current ? snapshot(root.current) : []),
    onBlocks: (blocks) => applyBlocks(blocks),
    onMeta: (meta) => {
      if (meta.title === undefined || document.activeElement === titleInput.current) return
      setTitle(meta.title)
      patchNoteLocal(note.id, { title: meta.title })
    },
    onSaved: (row) => {
      // Our own saves echo back too; only apply versions we have not written ourselves.
      if (
        typeof row.content === 'string' &&
        row.content !== lastSaved.current &&
        pending.current.content === undefined
      ) {
        applyBlocks(blocksOf(row.content))
      }
      if (
        typeof row.title === 'string' &&
        row.title !== title &&
        document.activeElement !== titleInput.current &&
        pending.current.title === undefined
      ) {
        setTitle(row.title)
        patchNoteLocal(note.id, { title: row.title })
      }
    },
  })

  const applyBlocks = (blocks: Blocks) => {
    const editor = root.current
    if (!editor) return
    const keep =
      document.activeElement === editor
        ? (caretBlock(editor)?.getAttribute('data-b') ?? null)
        : null
    mergeBlocks(editor, blocks, keep)
    setEmpty(!(editor.innerText ?? '').trim())
    // Keep the list preview current; the author saves it.
    patchNoteLocal(note.id, { content: sanitizeHtml(editor.innerHTML) })
    setLayout((value) => value + 1)
  }

  const reportCaret = () => {
    const editor = root.current
    if (editor) live.setActiveBlock(caretBlock(editor)?.getAttribute('data-b') ?? null)
  }
  const [title, setTitle] = useState(note.title)
  const [empty, setEmpty] = useState(!note.content)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [active, setActive] = useState(0)
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving'>('saved')
  const contentTimer = useRef<number | undefined>(undefined)
  const titleTimer = useRef<number | undefined>(undefined)
  const pending = useRef<{ content?: string; title?: string }>({})

  // Load the body once per note; afterwards the DOM is the source of truth while editing.
  useLayoutEffect(() => {
    if (!root.current) return
    root.current.innerHTML = sanitizeHtml(note.content) || '<p><br></p>'
    normalizeBlocks(root.current)
    setEmpty(!(root.current.innerText ?? '').trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id])

  const flush = async () => {
    window.clearTimeout(contentTimer.current)
    window.clearTimeout(titleTimer.current)
    const changes = pending.current
    pending.current = {}
    if (changes.content === undefined && changes.title === undefined) return
    setSaveState('saving')
    if (changes.content !== undefined) lastSaved.current = changes.content
    await updateNote(note.id, changes)
    setSaveState(Object.keys(pending.current).length ? 'pending' : 'saved')
  }
  // Save whatever is left when switching notes or leaving the page.
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })
  useEffect(() => () => void flushRef.current(), [])

  const queueContent = () => {
    if (!root.current) return
    normalizeBlocks(root.current)
    pending.current.content = sanitizeHtml(root.current.innerHTML)
    setEmpty(!(root.current.innerText ?? '').trim())
    live.sendBlocks()
    reportCaret()
    setSaveState('pending')
    window.clearTimeout(contentTimer.current)
    contentTimer.current = window.setTimeout(() => void flush(), 700)
  }

  const queueTitle = (value: string) => {
    setTitle(value)
    pending.current.title = value.slice(0, 300)
    live.sendMeta({ title: value.slice(0, 300) })
    setSaveState('pending')
    window.clearTimeout(titleTimer.current)
    titleTimer.current = window.setTimeout(() => void flush(), 700)
  }

  const openMenuIfSlash = () => {
    const editor = root.current
    if (!editor) return
    const slash = slashAtCaret(editor)
    if (!slash || !matching(slash.query).length) return setMenu(null)
    const range = document.createRange()
    range.setStart(slash.node, slash.start)
    range.setEnd(slash.node, slash.start + 1)
    const rect = range.getBoundingClientRect()
    const below = rect.bottom + 320 < window.innerHeight
    setMenu({
      query: slash.query,
      node: slash.node,
      start: slash.start,
      left: Math.min(rect.left, window.innerWidth - 280),
      top: below ? rect.bottom + 6 : Math.max(8, rect.top - 326),
    })
    setActive(0)
  }

  const runCommand = (command: Command) => {
    const editor = root.current
    if (!editor || !menu) return
    // Remove the typed "/query" and leave the caret where it was.
    const range = document.createRange()
    range.setStart(menu.node, menu.start)
    range.setEnd(menu.node, Math.min(menu.node.length, menu.start + 1 + menu.query.length))
    range.deleteContents()
    const selection = document.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    setMenu(null)
    editor.focus()
    command.run(editor)
    queueContent()
  }

  const tryShortcut = () => {
    const editor = root.current
    const selection = document.getSelection()
    const node = selection?.anchorNode
    if (!editor || !node || node.nodeType !== Node.TEXT_NODE || !selection?.isCollapsed) return
    const block = blockAtCaret(editor)
    if (!block || block.tagName === 'LI' || block.tagName === 'PRE') return
    const before = (node.textContent ?? '').slice(0, selection.anchorOffset)
    // Only when the marker is all the line holds so far, followed by a space.
    if (!/[\s ]$/.test(before) || block.textContent?.trim() !== before.trim()) return
    const marker = before.trim()
    const shortcut = SHORTCUTS.find(([pattern]) => pattern.test(marker))
    if (!shortcut) return
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, selection.anchorOffset)
    range.deleteContents()
    shortcut[1](editor)
  }

  const items = menu ? matching(menu.query) : []

  const style = note.meeting
    ? meetingStyle({ title: note.meeting.title, location: null }, categories)
    : null
  // Current project name and color (it may have been recolored since the note loaded).
  const known = projects.find((item) => item.id === note.projectId)
  const project = known ? { name: known.name, color: known.color } : note.project

  // Where each collaborator is editing: a colored bar and their name beside that block.
  const markers = live.peers.flatMap((peer) => {
    const block =
      peer.block && root.current
        ? (root.current.querySelector(`[data-b="${CSS.escape(peer.block)}"]`) as HTMLElement | null)
        : null
    return block ? [{ peer, top: block.offsetTop, height: block.offsetHeight }] : []
  })

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-6">
        {note.meeting && style ? (
          <span
            className={`inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${style.chip}`}
            title="Notes for this meeting"
          >
            <CalendarClock size={13} className="shrink-0" />
            <span className="truncate">{note.meeting.title}</span>
            <span className="shrink-0 opacity-80">
              ·{' '}
              {new Date(note.meeting.startsAt).toLocaleString([], {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </span>
        ) : note.meetingId ? null : (
          <span className="text-xs text-ink-3">Note</span>
        )}
        {/* Project: the owner files the note; collaborators see where it lives. */}
        {notesCollab && owner ? (
          <label
            className={`inline-flex h-7 max-w-[14rem] items-center gap-1.5 rounded-md border px-2 text-xs ${
              note.projectId
                ? 'border-line-strong bg-surface-2 text-ink'
                : 'border-dashed border-line-strong text-ink-2'
            }`}
            title="Project"
          >
            {project ? (
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: project.color }}
              />
            ) : (
              <FolderKanban size={13} className="shrink-0" />
            )}
            <select
              value={note.projectId ?? ''}
              onChange={(event) =>
                void updateNote(note.id, { projectId: event.target.value || null })
              }
              className="min-w-0 truncate bg-transparent outline-none"
              aria-label="Project"
            >
              <option value="">No project</option>
              {projects
                .filter((item) => isOwn(item.workspaceId))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          project && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-surface-2 px-2 text-xs text-ink">
              <span className="size-2.5 rounded-[3px]" style={{ background: project.color }} />
              {project.name}
            </span>
          )
        )}
        {!owner && (
          <span className="text-2xs text-ink-2">Shared by {personName(note.ownerId)}</span>
        )}

        <span className="ml-auto flex items-center gap-2">
          {/* Who else has this note open right now. */}
          {live.peers.length > 0 && (
            <span className="flex -space-x-1.5" aria-label="Editing now">
              {live.peers.slice(0, 4).map((peer) => (
                <span
                  key={peer.id}
                  className="grid size-6 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-surface"
                  style={{ background: peer.color }}
                  title={`${peer.name} is here`}
                >
                  {initials(peer.name)}
                </span>
              ))}
            </span>
          )}
          {live.connected && (
            <span
              className="flex items-center gap-1 text-2xs font-medium text-success-ink"
              title="Changes sync live"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
              Live
            </span>
          )}
          <span className="text-2xs text-ink-3" aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : saveState === 'pending' ? 'Editing…' : 'Saved'}
          </span>
        </span>

        {notesCollab && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSharing((value) => !value)}
              aria-expanded={sharing}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium ${
                note.members.length
                  ? 'border-primary/40 bg-primary-light text-primary-ink'
                  : 'border-line-strong text-ink-2 hover:text-ink'
              }`}
              title="Collaborators"
            >
              <Users size={14} />
              {note.members.length ? note.members.length : 'Share'}
            </button>
            {sharing && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setSharing(false)}
                  aria-label="Close sharing"
                />
                <div className="neo-popover animate-pop absolute right-0 top-10 z-30 w-[min(340px,calc(100vw-2rem))] rounded-xl p-3">
                  <p className="text-sm font-semibold text-ink">Collaborators</p>
                  <p className="mb-3 text-2xs text-ink-2">
                    {owner
                      ? 'People you add can read and edit this note with you in real time.'
                      : `Shared by ${personName(note.ownerId)}. Everyone here edits together.`}
                  </p>
                  <PeoplePicker
                    ids={note.members}
                    canEdit={owner}
                    emptyText="Only you so far."
                    onAdd={(person) => shareNote(note.id, person)}
                    onRemove={(id) => void unshareNote(note.id, id)}
                  />
                  {!owner && profile && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Leave this note? You will no longer see it.')) return
                        if (await unshareNote(note.id, profile.id)) onDeleted()
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-error-ink hover:underline"
                    >
                      <LogOut size={13} /> Leave note
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => void updateNote(note.id, { pinned: !note.pinned })}
          className={`grid size-8 place-items-center rounded-lg hover:bg-surface-2 ${note.pinned ? 'text-primary-ink' : 'text-ink-2'}`}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          title={note.pinned ? 'Unpin' : 'Pin to top'}
        >
          {note.pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
        {owner && (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Delete this note for everyone? This cannot be undone.')) return
              window.clearTimeout(contentTimer.current)
              window.clearTimeout(titleTimer.current)
              pending.current = {}
              if (await deleteNote(note.id)) onDeleted()
            }}
            className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-error-light hover:text-error-ink"
            aria-label="Delete note"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-8">
        <input
          ref={titleInput}
          value={title}
          onChange={(event) => queueTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'ArrowDown') {
              event.preventDefault()
              root.current?.focus()
            }
          }}
          maxLength={300}
          placeholder="Untitled"
          aria-label="Note title"
          className="w-full bg-transparent text-2xl font-bold tracking-tight text-ink outline-none placeholder:text-ink-3"
        />
        <div className="relative mt-3">
          {markers.map(({ peer, top, height }) => (
            <span key={peer.id} aria-hidden>
              <span
                className="pointer-events-none absolute -left-3 w-[3px] rounded-full transition-[top,height] duration-200"
                style={{ top, height, background: peer.color }}
              />
              <span
                className="pointer-events-none absolute -left-3 -translate-y-full rounded px-1 text-[10px] font-semibold leading-4 text-white transition-[top] duration-200"
                style={{ top, background: peer.color }}
              >
                {peer.name.split(' ')[0]}
              </span>
            </span>
          ))}
          {empty && (
            <p className="pointer-events-none absolute left-0 top-0 text-sm text-ink-3">
              Type <kbd className="rounded border border-line-strong px-1 font-sans">/</kbd> for
              to-dos, headings, colors and more…
            </p>
          )}
          <div
            ref={root}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Note"
            onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
            onInput={() => {
              tryShortcut()
              openMenuIfSlash()
              queueContent()
            }}
            onKeyDown={(event) => {
              if (menu && items.length) {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  const step = event.key === 'ArrowDown' ? 1 : -1
                  setActive((index) => (index + step + items.length) % items.length)
                  return
                }
                if (event.key === 'Enter' || event.key === 'Tab') {
                  event.preventDefault()
                  runCommand(items[Math.min(active, items.length - 1)])
                  return
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setMenu(null)
                  return
                }
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                // A new to-do item starts unticked (browsers copy the ticked state).
                window.setTimeout(() => {
                  const editor = root.current
                  const item = editor && blockAtCaret(editor)
                  if (item?.tagName === 'LI' && item.closest('ul[data-type="todo"]')) {
                    item.setAttribute('data-checked', 'false')
                  }
                }, 0)
              }
            }}
            onKeyUp={reportCaret}
            onClick={reportCaret}
            onMouseDown={(event) => {
              // Clicking a to-do's box (the area left of its text) ticks it.
              const item = (event.target as HTMLElement).closest?.('li')
              if (!item || !item.closest('ul[data-type="todo"]')) return
              if (event.clientX - item.getBoundingClientRect().left > 22) return
              event.preventDefault()
              item.setAttribute(
                'data-checked',
                item.getAttribute('data-checked') === 'true' ? 'false' : 'true',
              )
              queueContent()
            }}
            onPaste={(event) => {
              const html = event.clipboardData.getData('text/html')
              if (!html) return
              event.preventDefault()
              document.execCommand('insertHTML', false, sanitizeHtml(html))
              queueContent()
            }}
            onBlur={() => {
              window.setTimeout(() => setMenu(null), 150)
              live.setActiveBlock(null)
              void flush()
            }}
            className="rich-content min-h-[50vh] text-[15px] leading-7 text-ink outline-none"
          />
        </div>
      </div>

      {menu &&
        items.length > 0 &&
        createPortal(
          <div
            role="listbox"
            aria-label="Commands"
            style={{ top: menu.top, left: menu.left }}
            className="neo-popover animate-pop fixed z-[80] max-h-[320px] w-[268px] overflow-y-auto rounded-xl p-1.5"
          >
            {items.map((command, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                key={command.id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => runCommand(command)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${
                  index === active ? 'bg-surface-2' : ''
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink-2">
                  {command.swatch ? (
                    <span className="rich-content text-sm font-bold">
                      <span className={command.swatch}>A</span>
                    </span>
                  ) : (
                    <command.icon size={15} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-ui font-medium text-ink">
                    {command.label}
                  </span>
                  <span className="block truncate text-2xs text-ink-3">
                    /{command.id} · {command.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
