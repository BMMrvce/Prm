'use client'

import { useEffect } from 'react'
import type { MailListResponse } from '@/lib/mail/types'
import { useToast } from '@/state/workbench-store'
import type { SpaceKey } from '@/types/workbench'
import { mailboxChanged } from './use-mailbox'

/** How often the inbox is checked while the tab is visible. */
const EVERY_MS = 60_000

type Seen = { account: string; latest: string }

const storageKey = (space: SpaceKey) => `aayama-mail-seen-${space}`

function readSeen(space: SpaceKey): Seen | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey(space)) ?? 'null') as Seen | null
  } catch {
    return null
  }
}

function writeSeen(space: SpaceKey, seen: Seen) {
  try {
    localStorage.setItem(storageKey(space), JSON.stringify(seen))
  } catch {
    // Storage blocked: alerts still work for this visit.
  }
}

/**
 * Watches this workspace's inbox and shows a toast when new mail arrives ("New email from …"),
 * refreshing any open mail views. Checks every minute while the tab is visible, and right
 * away when you come back to it. The newest message already announced is remembered per
 * workspace and account, so reloading the page never repeats an alert.
 */
export function useNewMailAlerts(space: SpaceKey) {
  const { showToast } = useToast()

  useEffect(() => {
    let timer: number | undefined
    let stopped = false
    let checking = false

    const check = async () => {
      if (stopped || checking || document.visibilityState !== 'visible') return
      checking = true
      try {
        const response = await fetch(`/api/mail/${space}?folder=inbox&limit=5`, {
          cache: 'no-store',
        })
        const data = (await response.json()) as MailListResponse
        if (data.status?.state !== 'connected' || !Array.isArray(data.messages)) return
        const account = data.status.account
        const newest = data.messages.reduce(
          (max, message) => (message.date > max ? message.date : max),
          '',
        )
        const seen = readSeen(space)
        // First check for this mailbox: remember where we are, announce nothing.
        if (!seen || seen.account !== account) {
          writeSeen(space, { account, latest: newest })
          return
        }
        const fresh = data.messages
          .filter((message) => message.unread && message.date > seen.latest)
          .sort((a, b) => b.date.localeCompare(a.date))
        if (newest > seen.latest) writeSeen(space, { account, latest: newest })
        if (!fresh.length) return
        const [latest] = fresh
        showToast(
          fresh.length === 1
            ? `New email from ${latest.from}: ${latest.subject}`
            : `${fresh.length} new emails · latest from ${latest.from}: ${latest.subject}`,
          6000,
        )
        mailboxChanged(space)
      } catch {
        // Offline or the mail server is busy: try again next round.
      } finally {
        checking = false
      }
    }

    const loop = () => {
      timer = window.setTimeout(async () => {
        await check()
        if (!stopped) loop()
      }, EVERY_MS)
    }
    // A first look shortly after the page settles, then every minute.
    const first = window.setTimeout(() => void check(), 5_000)
    loop()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      window.clearTimeout(first)
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [space, showToast])
}
