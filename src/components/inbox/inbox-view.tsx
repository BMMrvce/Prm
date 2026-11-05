'use client'

import { ArrowLeft, PenSquare, RefreshCw, Reply } from 'lucide-react'
import { useState } from 'react'
import { ComposeForm } from '@/components/mail/compose-form'
import { MailNotice } from '@/components/mail/mail-notice'
import { fetchMessage, useMailbox } from '@/components/mail/use-mailbox'
import { mailDate } from '@/lib/format'
import type { MailFolder, MailMessage } from '@/lib/mail/types'
import { useWorkspace } from '@/state/workbench-store'

// Remote mail HTML is rendered in a script-less sandbox with a CSP that blocks everything
// except images, inline styles and fonts; links open in a new tab.
const MAIL_FRAME_HEAD =
  '<meta charset="utf-8"><base target="_blank">' +
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:">` +
  '<style>body{margin:0;padding:16px;font:14px/1.5 system-ui,sans-serif;color:#222226;word-break:break-word}img{max-width:100%;height:auto}</style>'

type Pane =
  | { kind: 'empty' }
  | { kind: 'compose'; to?: string; subject?: string }
  | { kind: 'message'; id: string }

export function InboxView() {
  const { workspace } = useWorkspace()
  const [folder, setFolder] = useState<MailFolder>('inbox')
  const { status, messages, loading, error, refresh, markRead } = useMailbox(workspace.key, folder)
  const [pane, setPane] = useState<Pane>({ kind: 'empty' })
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
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e4e4e7] px-4 py-3">
          <div className="mr-auto min-w-0">
            <h3 className="font-semibold">
              {status?.state === 'connected' ? status.label : 'Mail'}
            </h3>
            <p className="truncate text-xs text-[#73737a]">
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
            className="neo-control grid size-9 place-items-center rounded-lg text-[#4d4d55] disabled:opacity-60"
            aria-label="Refresh mailbox"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setPane({ kind: 'compose' })}
            disabled={!connected}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#493bd0] px-3 text-xs font-medium text-white disabled:opacity-50"
          >
            <PenSquare size={14} /> Compose
          </button>
        </div>
        <div className="flex gap-1 border-b border-[#e8e8eb] px-4">
          {(['inbox', 'sent'] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => switchFolder(tab)}
              className={`border-b-2 px-2 py-2.5 text-xs font-medium capitalize ${
                folder === tab
                  ? 'border-[#493bd0] text-[#493bd0]'
                  : 'border-transparent text-[#77777d]'
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
          <p className="px-5 py-8 text-center text-sm text-[#88888e]">Fetching {folder}…</p>
        )}
        {!loading && connected && !error && !messages.length && (
          <p className="px-5 py-8 text-center text-sm text-[#88888e]">No messages in {folder}.</p>
        )}
        <div className="max-h-[70vh] divide-y divide-[#eeeeef] overflow-y-auto">
          {messages.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => void open(item.id)}
              aria-current={pane.kind === 'message' && pane.id === item.id ? 'true' : undefined}
              className="flex w-full min-w-0 gap-3 px-4 py-3 text-left hover:bg-[#fafaff] aria-[current]:bg-[#eeeeff]"
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread ? 'bg-[#493bd0]' : 'bg-transparent'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p
                    className={`min-w-0 flex-1 truncate text-sm ${item.unread ? 'font-semibold' : 'font-medium'}`}
                  >
                    {folder === 'sent' ? `To ${item.to || '—'}` : item.from}
                  </p>
                  <span className="shrink-0 text-[11px] text-[#88888e]">{mailDate(item.date)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#55555c]">{item.subject}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        className={`neo-card min-w-0 flex-col overflow-hidden rounded-xl ${paneOpen ? 'flex' : 'hidden lg:flex'}`}
      >
        {paneOpen && (
          <div className="border-b border-[#e4e4e7] px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setPane({ kind: 'empty' })}
              className="flex items-center gap-1.5 text-xs font-medium text-[#493bd0]"
            >
              <ArrowLeft size={14} /> Back to {folder}
            </button>
          </div>
        )}
        {pane.kind === 'empty' && (
          <p className="m-auto px-6 py-16 text-center text-sm text-[#88888e]">
            {connected ? 'Select a message to read it.' : 'Connect the mailbox to read mail here.'}
          </p>
        )}
        {pane.kind === 'compose' && (
          <div className="flex flex-1 flex-col p-5">
            <h3 className="mb-3 font-semibold">New message</h3>
            <ComposeForm
              key={`${pane.to}-${pane.subject}`}
              space={workspace.key}
              from={status?.state === 'connected' ? status.account : undefined}
              defaultTo={pane.to}
              defaultSubject={pane.subject}
              onSent={() => {
                setPane({ kind: 'empty' })
                if (folder === 'sent') void refresh()
              }}
            />
          </div>
        )}
        {pane.kind === 'message' && (
          <div className="flex min-w-0 flex-1 flex-col">
            {messageError && <p className="m-5 text-sm text-[#a52828]">{messageError}</p>}
            {!message && !messageError && (
              <p className="m-auto py-16 text-sm text-[#88888e]">Opening message…</p>
            )}
            {message && (
              <>
                <div className="flex flex-wrap items-start gap-3 border-b border-[#e4e4e7] px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-[17px] font-semibold">{message.subject}</h3>
                    <p className="mt-1 truncate text-xs text-[#55555c]">
                      {message.from}
                      {message.fromAddress && message.fromAddress !== message.from && (
                        <span className="text-[#88888e]"> &lt;{message.fromAddress}&gt;</span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#88888e]">
                      To {message.to || '—'} ·{' '}
                      {message.date && new Date(message.date).toLocaleString()}
                    </p>
                  </div>
                  {message.fromAddress && folder === 'inbox' && (
                    <button
                      type="button"
                      onClick={() =>
                        setPane({
                          kind: 'compose',
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
                  <iframe
                    title={message.subject}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={`<!doctype html><html><head>${MAIL_FRAME_HEAD}</head><body>${message.html}</body></html>`}
                    className="h-[65vh] w-full flex-1 bg-white"
                  />
                ) : (
                  <pre className="flex-1 whitespace-pre-wrap break-words p-5 font-sans text-sm leading-6 text-[#222226]">
                    {message.text || '(empty message)'}
                  </pre>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
