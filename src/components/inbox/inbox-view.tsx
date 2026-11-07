'use client'

import { ArrowLeft, PenSquare, RefreshCw, Reply } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ComposeDialog, type ComposeDraft } from '@/components/mail/compose-dialog'
import {
  EMPTY_MAIL_FILTERS,
  filtersActive,
  MailFilters,
  toMailQuery,
  type MailFilterState,
} from '@/components/mail/mail-filters'
import { MailNotice } from '@/components/mail/mail-notice'
import {
  fetchMessage,
  markMessageRead,
  prefetchMessage,
  useMailbox,
} from '@/components/mail/use-mailbox'
import { mailDate } from '@/lib/format'
import type { MailFolder, MailMessage } from '@/lib/mail/types'
import { useWorkspace } from '@/state/workbench-store'
import { AttachmentList } from './attachment-list'
import { MailFrame } from './mail-frame'

type Pane = { kind: 'empty' } | { kind: 'message'; id: string }

export function InboxView() {
  const { workspace } = useWorkspace()
  const [folder, setFolder] = useState<MailFolder>('inbox')
  const params = useSearchParams()
  // Arriving from search (?search=…) prefills the mail search; ?compose=1 opens a new message.
  const [filters, setFilters] = useState<MailFilterState>(() => ({
    ...EMPTY_MAIL_FILTERS,
    search: params.get('search') ?? '',
  }))
  const query = useMemo(() => toMailQuery(filters), [filters])
  const {
    status,
    messages,
    loading,
    syncing,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    markRead,
  } = useMailbox(workspace.key, folder, query)
  const list = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  // Infinite scroll: load the next page when the end of the list comes into view.
  useEffect(() => {
    const target = sentinel.current
    if (!target || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { root: list.current, rootMargin: '240px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadMore])
  const [pane, setPane] = useState<Pane>({ kind: 'empty' })
  const [draft, setDraft] = useState<ComposeDraft | null>(null)
  useEffect(() => {
    if (params.get('compose') === '1') setDraft({})
    // Only when arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const connected = status?.state === 'connected'

  const open = async (id: string) => {
    setPane({ kind: 'message', id })
    setMessage(null)
    setMessageError(null)
    try {
      // Usually already loaded by the hover prefetch, so this is instant.
      setMessage(await fetchMessage(workspace.key, folder, id))
      if (messages.find((item) => item.id === id)?.unread) {
        markRead(id)
        void markMessageRead(workspace.key, folder, id)
      }
    } catch (caught) {
      setMessageError(caught instanceof Error ? caught.message : 'Could not open the message.')
    }
  }

  const switchFolder = (next: MailFolder) => {
    setFolder(next)
    list.current?.scrollTo({ top: 0 })
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
            <RefreshCw size={15} className={loading || syncing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setDraft({})}
            disabled={!connected}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary disabled:opacity-50 hover:bg-primary-hover active:bg-primary-active"
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
                folder === tab ? 'border-primary text-primary-ink' : 'border-transparent text-ink-2'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {connected && (
          <div className="border-b border-line px-4 py-3">
            <MailFilters value={filters} onChange={setFilters} />
          </div>
        )}
        <div className="p-3 empty:hidden">
          <MailNotice space={workspace.key} status={status} error={error} />
        </div>
        {loading && !messages.length && (
          <p className="px-5 py-8 text-center text-sm text-ink-3">Fetching {folder}…</p>
        )}
        {!loading && connected && !error && !messages.length && (
          <div className="px-5 py-8 text-center text-sm text-ink-3">
            {filtersActive(filters) ? (
              <>
                No messages match these filters.
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_MAIL_FILTERS)}
                  className="mt-2 block w-full text-xs font-semibold text-primary-ink hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              `No messages in ${folder}.`
            )}
          </div>
        )}
        <div ref={list} className="max-h-[70vh] divide-y divide-line-soft overflow-y-auto">
          {messages.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => void open(item.id)}
              // Start downloading on hover/focus so opening feels instant.
              onPointerEnter={() => prefetchMessage(workspace.key, folder, item.id)}
              onFocus={() => prefetchMessage(workspace.key, folder, item.id)}
              aria-current={pane.kind === 'message' && pane.id === item.id ? 'true' : undefined}
              className="animate-row cv-row flex w-full min-w-0 gap-3 px-4 py-3 text-left hover:bg-primary-subtle aria-[current]:bg-primary-light"
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
          {messages.length > 0 && (
            <div ref={sentinel} className="px-4 py-3 text-center text-2xs text-ink-3">
              {loadingMore ? (
                'Loading more…'
              ) : hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="font-semibold text-primary-ink hover:underline"
                >
                  Load more
                </button>
              ) : (
                `All ${messages.length} message${messages.length === 1 ? '' : 's'} loaded`
              )}
            </div>
          )}
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
              className="flex items-center gap-1.5 text-xs font-medium text-primary-ink"
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
                <AttachmentList
                  space={workspace.key}
                  folder={folder}
                  messageId={message.id}
                  attachments={message.attachments ?? []}
                />
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
