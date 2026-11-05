'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MailFolder, MailListResponse, MailMessage, SendMailInput } from '@/lib/mail/types'
import type { SpaceKey } from '@/types/workbench'

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

/** Live folder listing from `/api/mail/[space]`, with a manual `refresh`. */
export function useMailbox(space: SpaceKey, folder: MailFolder) {
  const [data, setData] = useState<MailListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await readJson<MailListResponse>(
        await fetch(`/api/mail/${space}?folder=${folder}`, { cache: 'no-store' }),
      )
      setData(result)
      setError(result.error ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load mail.')
    } finally {
      setLoading(false)
    }
  }, [space, folder])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = useCallback((id: string) => {
    setData(
      (current) =>
        current && {
          ...current,
          messages: current.messages.map((message) =>
            message.id === id ? { ...message, unread: false } : message,
          ),
        },
    )
  }, [])

  return {
    status: data?.status ?? null,
    messages: data?.messages ?? [],
    loading,
    error,
    refresh,
    markRead,
  }
}

export async function fetchMessage(space: SpaceKey, folder: MailFolder, id: string) {
  const query = new URLSearchParams({ folder, id })
  return readJson<MailMessage>(await fetch(`/api/mail/${space}/message?${query}`))
}

export async function sendMessage(space: SpaceKey, input: SendMailInput) {
  await readJson(
    await fetch(`/api/mail/${space}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  )
}
