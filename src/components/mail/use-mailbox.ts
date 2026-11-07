'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  MailFolder,
  MailListResponse,
  MailMessage,
  MailQuery,
  MailStatus,
  MailSummary,
  SendMailInput,
} from '@/lib/mail/types'
import type { SpaceKey } from '@/types/workbench'

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

async function fetchPage(space: SpaceKey, folder: MailFolder, query: MailQuery) {
  const params = new URLSearchParams({ folder })
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value))
  return readJson<MailListResponse>(
    await fetch(`/api/mail/${space}?${params}`, { cache: 'no-store' }),
  )
}

/**
 * Last result per mailbox view (space, folder and filters), shared by every component on the
 * page: the dashboard card and the Inbox show it instantly, then refresh in the background.
 */
type CachedPage = {
  at: number
  status: MailStatus
  messages: MailSummary[]
  nextCursor: string | null
  error: string | null
}
const pages = new Map<string, CachedPage>()
/** Cached results newer than this skip the background refresh entirely. */
const FRESH_MS = 30_000

/**
 * A folder of `/api/mail/[space]`, a page at a time. The first page shows from cache at once
 * (refreshing behind the scenes) and loads whenever the folder or filters change;
 * `loadMore` appends pages until the folder (or search) is exhausted. `pageSize` lets small
 * views (the dashboard card) ask for fewer messages so they arrive sooner.
 */
export function useMailbox(
  space: SpaceKey,
  folder: MailFolder,
  query: MailQuery = {},
  pageSize?: number,
) {
  const { search = '', after = '', before = '' } = query
  const key = JSON.stringify([space, folder, search, after, before])
  const cached = pages.get(key)
  const [status, setStatus] = useState<MailStatus | null>(cached?.status ?? null)
  const [messages, setMessages] = useState<MailSummary[]>(cached?.messages ?? [])
  const [nextCursor, setNextCursor] = useState<string | null>(cached?.nextCursor ?? null)
  const [loading, setLoading] = useState(!cached)
  /** A background refresh of what is already on screen. */
  const [syncing, setSyncing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(cached?.error ?? null)
  // Ignores responses for filters that have since changed.
  const generation = useRef(0)

  const remember = (page: Omit<CachedPage, 'at'>) => pages.set(key, { ...page, at: Date.now() })

  const refresh = useCallback(
    async (force = true) => {
      const run = ++generation.current
      const hit = pages.get(key)
      if (hit) {
        // Show the cached view immediately; refresh it unless it is brand new.
        setStatus(hit.status)
        setMessages(hit.messages)
        setNextCursor(hit.nextCursor)
        setError(hit.error)
        setLoading(false)
        if (!force && Date.now() - hit.at < FRESH_MS) return
        setSyncing(true)
      } else {
        setLoading(true)
        setMessages([])
        setNextCursor(null)
      }
      try {
        const result = await fetchPage(space, folder, {
          search,
          after,
          before,
          limit: pageSize,
        })
        if (run !== generation.current) return
        const page = {
          status: result.status,
          messages: result.messages,
          nextCursor: result.nextCursor ?? null,
          error: result.error ?? null,
        }
        remember(page)
        setStatus(page.status)
        setMessages(page.messages)
        setNextCursor(page.nextCursor)
        setError(page.error)
      } catch (caught) {
        if (run !== generation.current) return
        setError(caught instanceof Error ? caught.message : 'Could not load mail.')
      } finally {
        if (run === generation.current) {
          setLoading(false)
          setSyncing(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, pageSize],
  )

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loading) return
    const run = generation.current
    setLoadingMore(true)
    try {
      const result = await fetchPage(space, folder, { search, after, before, cursor: nextCursor })
      if (run !== generation.current) return
      setMessages((current) => {
        const seen = new Set(current.map((message) => message.id))
        const merged = [...current, ...result.messages.filter((message) => !seen.has(message.id))]
        if (status) {
          remember({
            status,
            messages: merged,
            nextCursor: result.nextCursor ?? null,
            error: result.error ?? null,
          })
        }
        return merged
      })
      setNextCursor(result.nextCursor ?? null)
      if (result.error) setError(result.error)
    } catch (caught) {
      if (run === generation.current) {
        setError(caught instanceof Error ? caught.message : 'Could not load more mail.')
      }
    } finally {
      if (run === generation.current) setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nextCursor, loadingMore, loading, status])

  const markRead = useCallback(
    (id: string) => {
      setMessages((current) => {
        const next = current.map((message) =>
          message.id === id ? { ...message, unread: false } : message,
        )
        const hit = pages.get(key)
        if (hit) pages.set(key, { ...hit, messages: next })
        return next
      })
    },
    [key],
  )

  return {
    status,
    messages,
    loading,
    syncing,
    loadingMore,
    hasMore: Boolean(nextCursor),
    error,
    refresh: () => refresh(true),
    loadMore,
    markRead,
  }
}

/** Opened (or prefetched) messages, so reopening one, or opening a hovered one, is instant. */
const bodies = new Map<string, Promise<MailMessage>>()
const MAX_BODIES = 60

export function fetchMessage(space: SpaceKey, folder: MailFolder, id: string) {
  const key = `${space}:${folder}:${id}`
  let pending = bodies.get(key)
  if (!pending) {
    // Always a peek: opening marks the message read separately (markMessageRead).
    const query = new URLSearchParams({ folder, id, peek: '1' })
    pending = fetch(`/api/mail/${space}/message?${query}`).then((response) =>
      readJson<MailMessage>(response),
    )
    // A failed fetch is forgotten so the next attempt retries.
    pending.catch(() => bodies.delete(key))
    bodies.set(key, pending)
    if (bodies.size > MAX_BODIES) bodies.delete(bodies.keys().next().value!)
  }
  return pending
}

/** Marks a message read on the mail server (when it is opened). */
export async function markMessageRead(space: SpaceKey, folder: MailFolder, id: string) {
  await fetch(`/api/mail/${space}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, id }),
  }).catch(() => {})
}

/** Starts loading a message (e.g. on hover) without waiting for it. Never marks it read. */
export function prefetchMessage(space: SpaceKey, folder: MailFolder, id: string) {
  void fetchMessage(space, folder, id).catch(() => {})
}

/** Sends a message, with any attachments, as multipart form data. */
export async function sendMessage(
  space: SpaceKey,
  input: Omit<SendMailInput, 'attachments'>,
  files: File[] = [],
) {
  const form = new FormData()
  form.set('to', input.to)
  if (input.cc) form.set('cc', input.cc)
  form.set('subject', input.subject)
  form.set('body', input.body)
  if (input.html) form.set('html', input.html)
  files.forEach((file) => form.append('attachments', file, file.name))
  await readJson(await fetch(`/api/mail/${space}`, { method: 'POST', body: form }))
  // Sent mail changes the Sent folder; drop its cached views.
  for (const key of pages.keys()) if (key.includes(`"${space}","sent"`)) pages.delete(key)
}
