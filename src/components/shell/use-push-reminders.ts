'use client'

import { useCallback, useEffect, useState } from 'react'

/** Whether this browser or installed app gets reminder notifications. */
export type PushState = 'checking' | 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replaceAll('-', '+')
    .replaceAll('_', '/')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

async function save(subscription: PushSubscription) {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? 'Could not save this device.')
  }
}

/**
 * Turns Web Push reminders on or off for this device. iPhone and iPad only allow it once
 * ಸKala² is added to the Home Screen.
 */
export function usePushReminders() {
  const [state, setState] = useState<PushState>('checking')

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_KEY) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      setState(ios && !standalone ? 'needs-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('blocked')
      return
    }
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription && Notification.permission === 'granted') {
      // Keep the server copy (and time zone) current; it may have been cleaned up.
      await save(subscription).catch(() => undefined)
      setState('on')
    } else {
      setState('off')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const enable = async () => {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'blocked' : 'off')
      throw new Error('Notifications were not allowed.')
    }
    const registration = await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID_KEY),
      }))
    await save(subscription)
    setState('on')
  }

  const disable = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
    }
    setState('off')
  }

  const test = async () => {
    const response = await fetch('/api/push/test', { method: 'POST' })
    const data = (await response.json().catch(() => ({}))) as { sent?: number; error?: string }
    if (!response.ok) throw new Error(data.error ?? 'Could not send a test notification.')
    return data.sent ?? 0
  }

  return { state, enable, disable, test }
}
