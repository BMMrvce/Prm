'use client'

import { Inbox } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { MailProviderKey, MailStatus } from '@/lib/mail/types'
import { workspacePath } from '@/lib/routes'
import { useToast } from '@/state/workbench-store'
import type { SpaceKey } from '@/types/workbench'

/** Where the browser starts each provider's sign-in; Hostinger uses a form instead. */
function connectUrl(provider: MailProviderKey, space: SpaceKey) {
  const next = encodeURIComponent(workspacePath(space, 'integrations'))
  return provider === 'gmail'
    ? `/api/oauth/google/connect?purpose=mail:${space}&next=${next}`
    : `/api/oauth/outlook/connect?space=${space}&next=${next}`
}

/** Your own mailbox for one workspace: connect Hostinger, Gmail or Outlook, or disconnect. */
export function MailConnection({ space }: { space: SpaceKey }) {
  const { showToast } = useToast()
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [hostingerOpen, setHostingerOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/mail', { cache: 'no-store' })
    const all = (await response.json()) as Record<string, MailStatus>
    setStatus(all[space] ?? null)
  }, [space])

  useEffect(() => {
    void load()
  }, [load])

  // Result of a Gmail or Outlook sign-in redirect (?mail=connected|error&message=…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('mail')
    if (!result) return
    showToast(
      result === 'connected'
        ? 'Mailbox connected.'
        : `Mailbox sign-in failed: ${params.get('message') ?? 'unknown error'}`,
      5000,
    )
    params.delete('mail')
    params.delete('message')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [showToast])

  const connectHostinger = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFormError(null)
    try {
      const response = await fetch(`/api/mail/${space}/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'hostinger', email, password }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setFormError(data.error ?? 'Could not connect the mailbox.')
        return
      }
      setPassword('')
      setHostingerOpen(false)
      showToast('Hostinger mailbox connected.')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect this mailbox from the workspace?')) return
    setBusy(true)
    await fetch(`/api/mail/${space}/connection`, { method: 'DELETE' })
    await load()
    setBusy(false)
    showToast('Mailbox disconnected.')
  }

  const field =
    'h-9 w-full rounded-lg border border-line-strong bg-field px-3 text-xs outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15'

  return (
    <div className="neo-card min-w-0 rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-light text-secondary">
          <Inbox size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {status?.state === 'connected' ? status.label : 'Mailbox'}
            </h3>
            {status && (
              <span
                className={`rounded-full px-2 py-0.5 text-2xs font-medium ${
                  status.state === 'connected'
                    ? 'bg-success-light text-success-ink'
                    : 'bg-surface-2 text-ink-2'
                }`}
              >
                {status.state === 'connected' ? 'Connected' : 'Not connected'}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-ink-2">
            {!status
              ? 'Checking…'
              : status.state === 'connected'
                ? status.account
                : 'Your own mailbox for this workspace. Only you can see it.'}
          </p>
        </div>
        {status?.state === 'connected' && (
          <div className="flex gap-2">
            <Link
              href={workspacePath(space, 'inbox')}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-medium"
            >
              Open inbox
            </Link>
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={busy}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-medium text-error-ink disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {status?.state === 'disconnected' && (
        <div className="mt-4 space-y-3">
          {status.note && <p className="text-xs text-warning-ink">{status.note}</p>}
          <div className="flex flex-wrap gap-2">
            {status.options.map((option) =>
              option.provider === 'hostinger' ? (
                <button
                  type="button"
                  key={option.provider}
                  onClick={() => setHostingerOpen((open) => !open)}
                  aria-expanded={hostingerOpen}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover active:bg-primary-active"
                >
                  Connect {option.label}
                </button>
              ) : option.available ? (
                <a
                  key={option.provider}
                  href={connectUrl(option.provider, space)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover active:bg-primary-active"
                >
                  Connect {option.label}
                </a>
              ) : (
                <span
                  key={option.provider}
                  title={option.note}
                  className="cursor-not-allowed rounded-lg bg-surface-2 px-3 py-2 text-xs font-medium text-ink-3"
                >
                  {option.label} · not set up on the server
                </span>
              ),
            )}
          </div>
          {hostingerOpen && (
            <form onSubmit={connectHostinger} className="grid max-w-md gap-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={field}
                placeholder="you@yourdomain.com"
                aria-label="Mailbox address"
                autoComplete="username"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={field}
                placeholder="Mailbox password"
                aria-label="Mailbox password"
                autoComplete="current-password"
                required
              />
              <p className="text-2xs text-ink-2">
                Use the full mailbox address and that mailbox&rsquo;s own password (the one for
                webmail), not your Hostinger account login. It is checked by signing in to
                Hostinger, then stored encrypted. Only you can use it.
              </p>
              {formError && (
                <p
                  className="rounded-lg bg-error-light px-3 py-2 text-xs text-error-ink"
                  role="alert"
                >
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="h-9 rounded-lg bg-primary text-xs font-medium text-white disabled:opacity-60 hover:bg-primary-hover active:bg-primary-active"
              >
                {busy ? 'Checking…' : 'Connect Hostinger Mail'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
