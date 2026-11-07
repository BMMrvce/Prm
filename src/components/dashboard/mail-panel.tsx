'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ComposeDialog } from '@/components/mail/compose-dialog'
import { MailNotice } from '@/components/mail/mail-notice'
import { PanelHeader } from '@/components/ui/panel'
import { useMailbox } from '@/components/mail/use-mailbox'
import { mailDate } from '@/lib/format'
import type { MailFolder } from '@/lib/mail/types'
import { workspacePath } from '@/lib/routes'
import type { WorkspaceData } from '@/types/workbench'

export function MailPanel({ workspace }: { workspace: WorkspaceData }) {
  const [mailTab, setMailTab] = useState<MailFolder>('inbox')
  const [composing, setComposing] = useState(false)
  const { status, messages, loading, error, refresh } = useMailbox(workspace.key, mailTab)
  const connected = status?.state === 'connected'

  return (
    <section className="neo-card flex min-h-[330px] min-w-0 flex-col rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={Mail}
        title="Mail"
        subtitle={
          status?.state === 'connected'
            ? `${status.label} · ${status.account}`
            : status
              ? 'No mailbox connected'
              : 'Checking…'
        }
      >
        {connected && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-2xs font-medium text-on-primary hover:bg-primary-hover active:bg-primary-active"
          >
            Compose
          </button>
        )}
      </PanelHeader>
      {composing && (
        <ComposeDialog
          space={workspace.key}
          from={status?.state === 'connected' ? status.account : undefined}
          draft={{}}
          onClose={() => setComposing(false)}
          onSent={() => {
            if (mailTab === 'sent') void refresh()
          }}
        />
      )}
      <div className="mt-3 flex items-center gap-1 border-b border-line">
        {(['inbox', 'sent'] as const).map((tab) => (
          <button
            type="button"
            onClick={() => setMailTab(tab)}
            className={`border-b-2 px-2 py-2 text-xs font-medium capitalize ${mailTab === tab ? 'border-primary text-primary-ink' : 'border-transparent text-ink-2'}`}
            key={tab}
          >
            {tab}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="ml-auto text-2xs font-medium text-primary-ink"
        >
          {loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>
      <div className="mt-2 empty:hidden">
        <MailNotice compact space={workspace.key} status={status} error={error} />
      </div>
      <div className="divide-y divide-line-soft">
        {loading && !messages.length ? (
          <p className="py-5 text-center text-xs text-ink-3">Fetching {mailTab}…</p>
        ) : (
          messages.slice(0, 4).map((message) => (
            <Link
              href={workspacePath(workspace.key, 'inbox')}
              className="block py-2.5"
              key={message.id}
            >
              <div className="flex items-baseline gap-2">
                <p
                  className={`min-w-0 flex-1 truncate text-xs ${message.unread ? 'font-semibold' : 'font-medium'}`}
                >
                  {message.subject}
                </p>
                <span className="shrink-0 text-2xs text-ink-3">{mailDate(message.date)}</span>
              </div>
              <p className="mt-0.5 truncate text-2xs text-ink-2">
                {mailTab === 'sent' ? `To ${message.to}` : `From ${message.from}`}
              </p>
            </Link>
          ))
        )}
      </div>
      {connected && (
        <Link
          href={workspacePath(workspace.key, 'inbox')}
          className="mt-auto pt-2 text-2xs font-medium text-primary-ink"
        >
          Open inbox →
        </Link>
      )}
    </section>
  )
}
