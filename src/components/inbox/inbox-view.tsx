'use client'

import { ArrowLeft, PenSquare, RefreshCw, Reply } from 'lucide-react'
import { useState } from 'react'
import { ComposeDialog, type ComposeDraft } from '@/components/mail/compose-dialog'
import { MailNotice } from '@/components/mail/mail-notice'
import { fetchMessage, useMailbox } from '@/components/mail/use-mailbox'
import { mailDate } from '@/lib/format'
import type { MailFolder, MailMessage } from '@/lib/mail/types'
import { useWorkspace } from '@/state/workbench-store'
import { MailFrame } from './mail-frame'

type Pane = { kind: 'empty' } | { kind: 'message'; id: string }

export function InboxView() {
  const { workspace } = useWorkspace()
  const [folder, setFolder] = useState<MailFolder>('inbox')
  const { status, messages, loading, error, refresh, markRead } = useMailbox(workspace.key, folder)
  const [pane, setPane] = useState<Pane>({ kind: 'empty' })
  const [draft, setDraft] = useState<ComposeDraft | null>(null)
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const connected = status?.state === 'connected'

  const open = async (id: string) => {
    setPane({ kind: 'message', id })
    setMessage(null)
    setMessageError(null)
    try {
      setMessage(await fetchMessage(workspace.key, folder, id))
      markRead(id)
    } catch (caught) {
      setMessageError(caught instanceof Error ? caught.message : 'Could not open the message.')
    }
  }

  const switchFolder = (next: MailFolder) => {
    setFolder(next)
    setPane({ kind: 'empty' })
  }

  const paneOpen = pane.kind !== 'empty'

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <section
        className={`neo-card min-w-0 flex-col overflow-hidden rounded-xl ${paneOpen ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="mr-auto min-w-0">
            <h3 className="font-semibold">
              {status?.state === 'connected' ? status.label : 'Mail'}
            </h3>
            <p className="truncate text-xs text-ink-2">
              {status?.state === 'connected'
                ? status.account
                : loading
                  ? 'Checking connection…'
                  : 'Not connected'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="neo-control grid size-9 place-items-center rounded-lg text-ink-2 disabled:opacity-60"
            aria-label="Refresh mailbox"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setDraft({})}
            disabled={!connected}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white disabled:opacity-50 hover:bg-primary-hover active:bg-primary-active"
          >
            <PenSquare size={14} /> Compose
          </button>
        </div>
        <div className="flex gap-1 border-b border-line px-4">
          {(['inbox', 'sent'] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => switchFolder(tab)}
              className={`border-b-2 px-2 py-2.5 text-xs font-medium capitalize ${
                folder === tab ? 'border-primary text-secondary' : 'border-transparent text-ink-2'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-3 empty:hidden">
          <MailNotice space={workspace.key} status={status} error={error} />
        </div>
        {loading && !messages.length && (
          <p className="px-5 py-8 text-center text-sm text-ink-3">Fetching {folder}…</p>
        )}
        {!loading && connected && !error && !messages.length && (
          <p className="px-5 py-8 text-center text-sm text-ink-3">No messages in {folder}.</p>
        )}
        <div className="max-h-[70vh] divide-y divide-line-soft overflow-y-auto">
          {messages.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => void open(item.id)}
              aria-current={pane.kind === 'message' && pane.id === item.id ? 'true' : undefined}
              className="flex w-full min-w-0 gap-3 px-4 py-3 text-left hover:bg-primary-subtle aria-[current]:bg-secondary-light"
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread ? 'bg-primary' : 'bg-transparent'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p
                    className={`min-w-0 flex-1 truncate text-sm ${item.unread ? 'font-semibold' : 'font-medium'}`}
                  >
                    {folder === 'sent' ? `To ${item.to || '—'}` : item.from}
                  </p>
                  <span className="shrink-0 text-2xs text-ink-3">{mailDate(item.date)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-2">{item.subject}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        className={`neo-card min-w-0 flex-col overflow-hidden rounded-xl ${paneOpen ? 'flex' : 'hidden lg:flex'}`}
      >
        {paneOpen && (
          <div className="border-b border-line px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setPane({ kind: 'empty' })}
              className="flex items-center gap-1.5 text-xs font-medium text-secondary"
            >
              <ArrowLeft size={14} /> Back to {folder}
            </button>
          </div>
        )}
        {pane.kind === 'empty' && (
          <p className="m-auto px-6 py-16 text-center text-sm text-ink-3">
            {connected ? 'Select a message to read it.' : 'Connect the mailbox to read mail here.'}
          </p>
        )}
        {pane.kind === 'message' && (
          <div className="flex min-w-0 flex-1 flex-col">
            {messageError && <p className="m-5 text-sm text-error-ink">{messageError}</p>}
            {!message && !messageError && (
              <p className="m-auto py-16 text-sm text-ink-3">Opening message…</p>
            )}
            {message && (
              <>
                <div className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 basis-60">
                    <h3 className="break-words text-lg font-semibold leading-snug">
                      {message.subject}
                    </h3>
                    {/* Full sender and recipients: wrap instead of cutting addresses off. */}
                    <p className="mt-2 text-ui font-medium text-ink">{message.from}</p>
                    {message.fromAddress && message.fromAddress !== message.from && (
                      <p className="break-all text-xs text-ink-2">{message.fromAddress}</p>
                    )}
                    <p className="mt-1.5 break-words text-xs text-ink-2">
                      <span className="text-ink-3">To </span>
                      {message.to || '—'}
                    </p>
                    {message.date && (
                      <p className="mt-0.5 text-xs text-ink-3">
                        {new Date(message.date).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {message.fromAddress && folder === 'inbox' && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          to: message.fromAddress,
                          subject: /^re:/i.test(message.subject)
                            ? message.subject
                            : `Re: ${message.subject}`,
                        })
                      }
                      className="neo-control flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium"
                    >
                      <Reply size={14} /> Reply
                    </button>
                  )}
                </div>
                {message.html ? (
                  <MailFrame title={message.subject} html={message.html} />
                ) : (
                  <pre className="flex-1 whitespace-pre-wrap p-4 font-sans text-sm leading-6 text-ink [overflow-wrap:anywhere] sm:p-5">
                    {message.text || '(empty message)'}
                  </pre>
                )}
              </>
            )}
          </div>
        )}
      </section>
      {draft && (
        <ComposeDialog
          space={workspace.key}
          from={status?.state === 'connected' ? status.account : undefined}
          draft={draft}
          onClose={() => setDraft(null)}
          onSent={() => {
            if (folder === 'sent') void refresh()
          }}
        />
      )}
    </div>
  )
}
