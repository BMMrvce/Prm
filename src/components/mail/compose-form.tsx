'use client'

import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useToast } from '@/state/workbench-store'
import type { SpaceKey } from '@/types/workbench'
import { RecipientInput } from './recipient-input'
import { sendMessage } from './use-mailbox'

/** Plain-text compose form that sends through the workspace's mailbox. */
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
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      // Suggestions leave a trailing ", " after the last address.
      await sendMessage(space, { to: to.trim().replace(/,$/, ''), subject, body })
      showToast('Email sent.', 2500)
      setTo('')
      setSubject('')
      setBody('')
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
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-2">
      {from && <p className="truncate text-2xs text-ink-2">From {from}</p>}
      <RecipientInput
        space={space}
        value={to}
        onChange={setTo}
        className={`${field} ${text} h-9`}
      />
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        className={`${field} ${text} h-9`}
        placeholder="Subject"
        aria-label="Subject"
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className={`${field} ${text} flex-1 resize-none py-2 ${compact ? 'min-h-[72px]' : 'min-h-[180px]'}`}
        placeholder="Write your message"
        aria-label="Message"
      />
      {error && <p className="text-2xs text-error-ink">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className={`flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60 ${text}`}
      >
        <Send size={13} />
        {sending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}
