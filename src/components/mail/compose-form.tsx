'use client'

import { Paperclip, Send, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from '@/lib/mail/types'
import { useToast } from '@/state/workbench-store'
import type { SpaceKey } from '@/types/workbench'
import { RecipientInput } from './recipient-input'
import { RichEditor, type RichEditorHandle } from './rich-editor'
import { sendMessage } from './use-mailbox'

/** "1.2 MB", "340 KB". */
function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Compose form that sends through the workspace's mailbox: To (and optional Cc), subject,
 * a formatted message, and attachments up to 4 MB in total.
 */
export function ComposeForm({
  space,
  from,
  defaultTo = '',
  defaultSubject = '',
  compact = false,
  onSent,
}: {
  space: SpaceKey
  from?: string
  defaultTo?: string
  defaultSubject?: string
  compact?: boolean
  onSent?: () => void
}) {
  const { showToast } = useToast()
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const editor = useRef<RichEditorHandle>(null)
  const picker = useRef<HTMLInputElement>(null)

  const total = files.reduce((sum, file) => sum + file.size, 0)

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files]
    for (const file of incoming) {
      if (next.length >= MAX_ATTACHMENTS) {
        setError(`Attach at most ${MAX_ATTACHMENTS} files.`)
        break
      }
      if (next.reduce((sum, item) => sum + item.size, 0) + file.size > MAX_ATTACHMENT_BYTES) {
        setError(`“${file.name}” would take attachments over 4 MB.`)
        continue
      }
      next.push(file)
    }
    setFiles(next)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = editor.current?.text() ?? ''
    if (!body && !subject.trim() && !files.length) {
      setError('Write a message or add a subject first.')
      return
    }
    setSending(true)
    setError(null)
    try {
      // Suggestions leave a trailing ", " after the last address.
      await sendMessage(
        space,
        {
          to: to.trim().replace(/,$/, ''),
          cc: cc.trim().replace(/,$/, '') || undefined,
          subject,
          body,
          html: editor.current?.isEmpty() ? undefined : editor.current?.html(),
        },
        files,
      )
      showToast('Email sent.', 2500)
      setTo('')
      setCc('')
      setSubject('')
      setFiles([])
      editor.current?.clear()
      onSent?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the email.')
    } finally {
      setSending(false)
    }
  }

  const field =
    'w-full min-w-0 rounded-lg border border-line-strong bg-field px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
  const text = compact ? 'text-xs' : 'text-sm'

  return (
    <form
      onSubmit={submit}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return
        event.preventDefault()
        setDragging(false)
        addFiles(event.dataTransfer.files)
      }}
      className={`relative flex min-h-0 flex-1 flex-col gap-2 ${dragging ? 'rounded-lg ring-2 ring-primary/40' : ''}`}
    >
      {from && <p className="truncate text-2xs text-ink-2">From {from}</p>}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <RecipientInput
            space={space}
            value={to}
            onChange={setTo}
            className={`${field} ${text} h-9`}
          />
        </div>
        {!showCc && (
          <button
            type="button"
            onClick={() => setShowCc(true)}
            className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Cc
          </button>
        )}
      </div>
      {showCc && (
        <RecipientInput
          space={space}
          value={cc}
          onChange={setCc}
          placeholder="Cc"
          className={`${field} ${text} h-9`}
        />
      )}
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        className={`${field} ${text} h-9`}
        placeholder="Subject"
        aria-label="Subject"
      />
      <RichEditor ref={editor} minHeight={compact ? 90 : 200} />

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Attachments">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 pl-2 pr-1 text-xs"
            >
              <Paperclip size={12} className="shrink-0 text-ink-3" />
              <span className="min-w-0 truncate text-ink">{file.name}</span>
              <span className="shrink-0 text-ink-3">{fileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => setFiles((current) => current.filter((_, at) => at !== index))}
                className="grid size-5 shrink-0 place-items-center rounded text-ink-3 hover:bg-surface-3 hover:text-ink"
                aria-label={`Remove ${file.name}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-2xs text-error-ink">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => picker.current?.click()}
          className={`flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 font-medium text-ink-2 hover:text-ink ${text}`}
        >
          <Paperclip size={14} /> Attach
        </button>
        <input
          ref={picker}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <span className="min-w-0 truncate text-2xs text-ink-3">
          {files.length
            ? `${files.length} file${files.length === 1 ? '' : 's'} · ${fileSize(total)} of 4 MB`
            : 'Drop files here or attach (up to 4 MB)'}
        </span>
        <button
          type="submit"
          disabled={sending}
          className={`ml-auto flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60 ${text}`}
        >
          <Send size={13} />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  )
}
