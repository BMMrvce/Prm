'use client'

import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Underline,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { sanitizeHtml } from '@/lib/sanitize-html'

export type RichEditorHandle = {
  /** The formatted message, cleaned. */
  html: () => string
  /** The same message as plain text. */
  text: () => string
  isEmpty: () => boolean
  clear: () => void
  focus: () => void
}

type Command = {
  icon: LucideIcon
  label: string
  run: () => void
  /** `document.queryCommandState` name, to show the button as on. */
  state?: string
}

/**
 * Small WYSIWYG editor for composing mail: bold, italic, underline, strikethrough, lists,
 * quote and links, with the usual shortcuts (Ctrl/⌘+B, I, U, K). Built on contentEditable
 * so the result is plain HTML that every mail client renders.
 */
export function RichEditor({
  ref,
  placeholder = 'Write your message',
  minHeight = 180,
  initialHtml = '',
}: {
  ref?: Ref<RichEditorHandle>
  placeholder?: string
  minHeight?: number
  initialHtml?: string
}) {
  const area = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(!initialHtml)
  const [active, setActive] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (area.current && initialHtml) area.current.innerHTML = sanitizeHtml(initialHtml)
    // Only on mount: later edits belong to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEmpty = () => !(area.current?.innerText ?? '').trim()

  useImperativeHandle(ref, () => ({
    html: () => sanitizeHtml(area.current?.innerHTML ?? ''),
    text: () => (area.current?.innerText ?? '').trim(),
    isEmpty,
    clear: () => {
      if (area.current) area.current.innerHTML = ''
      setEmpty(true)
    },
    focus: () => area.current?.focus(),
  }))

  const exec = (command: string, value?: string) => {
    area.current?.focus()
    document.execCommand(command, false, value)
    sync()
  }

  /** Re-reads which styles apply at the cursor, and whether the editor is empty. */
  const sync = () => {
    setEmpty(isEmpty())
    const next: Record<string, boolean> = {}
    for (const name of [
      'bold',
      'italic',
      'underline',
      'strikeThrough',
      'insertUnorderedList',
      'insertOrderedList',
    ]) {
      try {
        next[name] = document.queryCommandState(name)
      } catch {
        next[name] = false
      }
    }
    setActive(next)
  }

  useEffect(() => {
    const onSelection = () => {
      if (area.current?.contains(document.getSelection()?.anchorNode ?? null)) sync()
    }
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  })

  const addLink = () => {
    const selection = document.getSelection()
    const selected = selection?.toString() ?? ''
    const url = window.prompt('Link address', selected.startsWith('http') ? selected : 'https://')
    if (!url || !/^(https?:\/\/|mailto:)/i.test(url.trim())) return
    if (selected) exec('createLink', url.trim())
    else exec('insertHTML', `<a href="${encodeURI(url.trim())}">${url.trim()}</a>`)
  }

  const commands: (Command | 'gap')[] = [
    { icon: Bold, label: 'Bold (Ctrl+B)', run: () => exec('bold'), state: 'bold' },
    { icon: Italic, label: 'Italic (Ctrl+I)', run: () => exec('italic'), state: 'italic' },
    {
      icon: Underline,
      label: 'Underline (Ctrl+U)',
      run: () => exec('underline'),
      state: 'underline',
    },
    {
      icon: Strikethrough,
      label: 'Strikethrough',
      run: () => exec('strikeThrough'),
      state: 'strikeThrough',
    },
    'gap',
    {
      icon: List,
      label: 'Bulleted list',
      run: () => exec('insertUnorderedList'),
      state: 'insertUnorderedList',
    },
    {
      icon: ListOrdered,
      label: 'Numbered list',
      run: () => exec('insertOrderedList'),
      state: 'insertOrderedList',
    },
    { icon: Quote, label: 'Quote', run: () => exec('formatBlock', 'blockquote') },
    'gap',
    { icon: Link2, label: 'Link (Ctrl+K)', run: addLink },
    { icon: RemoveFormatting, label: 'Clear formatting', run: () => exec('removeFormat') },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line-strong bg-field focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-line-soft px-1.5 py-1"
        role="toolbar"
        aria-label="Formatting"
      >
        {commands.map((command, index) =>
          command === 'gap' ? (
            <span key={`gap-${index}`} className="mx-1 h-4 w-px bg-line" aria-hidden />
          ) : (
            <button
              type="button"
              key={command.label}
              // Keep the selection in the editor while clicking the toolbar.
              onMouseDown={(event) => event.preventDefault()}
              onClick={command.run}
              aria-label={command.label}
              aria-pressed={command.state ? Boolean(active[command.state]) : undefined}
              title={command.label}
              className={`grid size-7 place-items-center rounded-md ${
                command.state && active[command.state]
                  ? 'bg-primary-light text-primary-ink'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <command.icon size={14} />
            </button>
          ),
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {empty && (
          <p className="pointer-events-none absolute left-3 top-2.5 text-sm text-ink-3">
            {placeholder}
          </p>
        )}
        <div
          ref={area}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Message"
          onInput={sync}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
              event.preventDefault()
              addLink()
            }
          }}
          onPaste={(event) => {
            // Keep formatting from pasted content, minus anything unsafe.
            const html = event.clipboardData.getData('text/html')
            if (!html) return
            event.preventDefault()
            document.execCommand('insertHTML', false, sanitizeHtml(html))
            sync()
          }}
          className="rich-content h-full overflow-y-auto px-3 py-2.5 text-sm leading-6 text-ink outline-none"
          style={{ minHeight }}
        />
      </div>
    </div>
  )
}
