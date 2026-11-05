'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ComposeForm } from '@/components/mail/compose-form'
import { MailNotice } from '@/components/mail/mail-notice'
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
    <section className="neo-card flex min-h-[330px] min-w-0 flex-col rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">Mail</h2>
          <p className="truncate text-[10px] text-[#77777d]">
            {status?.state === 'connected'
              ? `${status.label} · ${status.account}`
              : status
                ? 'No mailbox connected'
                : 'Checking…'}
          </p>
        </div>
        {connected && (
          <button
            type="button"
            onClick={() => setComposing((value) => !value)}
            className="shrink-0 rounded-lg bg-[#493bd0] px-2.5 py-1.5 text-[10px] font-medium text-white"
          >
            {composing ? 'Close' : 'Compose'}
          </button>
        )}
      </div>
      {composing ? (
        <div className="mt-3 flex flex-1 flex-col">
          <ComposeForm compact space={workspace.key} onSent={() => setComposing(false)} />
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-1 border-b border-[#e8e8eb]">
            {(['inbox', 'sent'] as const).map((tab) => (
              <button
                type="button"
                onClick={() => setMailTab(tab)}
                className={`border-b-2 px-2 py-2 text-xs font-medium capitalize ${mailTab === tab ? 'border-[#493bd0] text-[#493bd0]' : 'border-transparent text-[#77777d]'}`}
                key={tab}
              >
                {tab}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="ml-auto text-[10px] font-medium text-[#493bd0]"
            >
              {loading ? 'Syncing…' : 'Refresh'}
            </button>
          </div>
          <div className="mt-2 empty:hidden">
            <MailNotice compact space={workspace.key} status={status} error={error} />
          </div>
          <div className="divide-y divide-[#eeeeef]">
            {loading && !messages.length ? (
              <p className="py-5 text-center text-xs text-[#88888e]">Fetching {mailTab}…</p>
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
                    <span className="shrink-0 text-[10px] text-[#99999f]">
                      {mailDate(message.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-[#77777d]">
                    {mailTab === 'sent' ? `To ${message.to}` : `From ${message.from}`}
                  </p>
                </Link>
              ))
            )}
          </div>
          {connected && (
            <Link
              href={workspacePath(workspace.key, 'inbox')}
              className="mt-auto pt-2 text-[11px] font-medium text-[#493bd0]"
            >
              Open inbox →
            </Link>
          )}
        </>
      )}
    </section>
  )
}
