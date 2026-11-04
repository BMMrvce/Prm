'use client'

import { useEffect, useState } from 'react'
import type { SpaceKey, WorkspaceData } from '@/types/workbench'

type MailTab = 'Inbox' | 'Sent'
type Message = { subject: string; from: string }

const demoInbox: Record<SpaceKey, Message[]> = {
  office: [
    { subject: 'Expense policy update', from: 'hr@acme.co' },
    { subject: 'Invoice #4021 is ready', from: 'finance@acme.co' },
  ],
  studio: [
    { subject: 'Homepage review notes', from: 'client@example.com' },
    { subject: 'Sprint 14 planning', from: 'team@studio.co' },
  ],
  personal: [
    { subject: 'Your weekly summary', from: 'me@gmail.com' },
    { subject: 'Receipt from City Market', from: 'receipts@gmail.com' },
  ],
}

const demoSentSubject: Record<SpaceKey, string> = {
  office: 'Re: Quarterly planning',
  studio: 'Project status update',
  personal: 'Weekend plans',
}

export function MailPanel({ workspace }: { workspace: WorkspaceData }) {
  const [mailTab, setMailTab] = useState<MailTab>('Inbox')
  const [mailLoading, setMailLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [email, setEmail] = useState(`To: ${workspace.email}`)
  const [subject, setSubject] = useState('')
  const [sent, setSent] = useState(false)
  const mailbox: Record<MailTab, Message[]> = {
    Inbox: demoInbox[workspace.key],
    Sent: [
      { subject: demoSentSubject[workspace.key], from: workspace.email },
      { subject: 'Follow-up and next steps', from: workspace.email },
    ],
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setMailLoading(false), 450)
    return () => window.clearTimeout(timeout)
  }, [])

  const refreshMail = () => {
    setMailLoading(true)
    window.setTimeout(() => setMailLoading(false), 550)
  }

  return (
    <section className="neo-card flex min-h-[330px] flex-col rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Mail</h2>
          <p className="text-[10px] text-[#77777d]">{workspace.mailProvider}</p>
        </div>
        <button
          type="button"
          onClick={() => setComposing((value) => !value)}
          className="rounded-lg bg-[#493bd0] px-2.5 py-1.5 text-[10px] font-medium text-white"
        >
          {composing ? 'Close' : 'Compose'}
        </button>
      </div>
      {composing ? (
        <>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="neo-inset mt-3 h-9 rounded-lg px-3 text-xs outline-none"
            aria-label="Email recipient"
          />
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="neo-inset mt-2 h-9 rounded-lg px-3 text-xs outline-none"
            aria-label="Email subject"
            placeholder="Subject"
          />
          <button
            type="button"
            onClick={() => setSent(true)}
            className="mt-auto h-9 rounded-lg bg-[#493bd0] text-xs font-medium text-white"
          >
            {sent ? 'Email queued' : 'Send'}
          </button>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-1 border-b border-[#e8e8eb]">
            {(['Inbox', 'Sent'] as const).map((tab) => (
              <button
                type="button"
                onClick={() => setMailTab(tab)}
                className={`border-b-2 px-2 py-2 text-xs font-medium ${mailTab === tab ? 'border-[#493bd0] text-[#493bd0]' : 'border-transparent text-[#77777d]'}`}
                key={tab}
              >
                {tab}
              </button>
            ))}
            <button
              type="button"
              onClick={refreshMail}
              className="ml-auto text-[10px] font-medium text-[#493bd0]"
            >
              {mailLoading ? 'Syncing…' : 'Refresh'}
            </button>
          </div>
          <div className="divide-y divide-[#eeeeef]">
            {mailLoading ? (
              <p className="py-5 text-center text-xs text-[#88888e]">
                Fetching {mailTab.toLowerCase()}…
              </p>
            ) : (
              mailbox[mailTab].map((message) => (
                <button type="button" className="w-full py-3 text-left" key={message.subject}>
                  <p className="truncate text-xs font-medium">{message.subject}</p>
                  <p className="mt-1 truncate text-[10px] text-[#77777d]">From {message.from}</p>
                </button>
              ))
            )}
          </div>
          <p className="mt-auto text-[9px] text-[#99999f]">
            Demo mailbox; live sync activates after authenticated provider connection.
          </p>
        </>
      )}
    </section>
  )
}
