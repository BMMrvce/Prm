'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'
import { mailDate } from '@/lib/format'
import { useToast, useWorkspace } from '@/state/workbench-store'
import { usePushReminders } from './use-push-reminders'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()
  const { notifications, markNotificationsRead } = useWorkspace()
  const unread = notifications.filter((item) => !item.readAt).length

  const push = usePushReminders()

  /** Runs a reminder-setting action, reporting failures as a toast. */
  const attempt = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      showToast(success, 3500)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Something went wrong.', 4500)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) void markNotificationsRead()
          setOpen((visible) => !visible)
        }}
        className="neo-control relative grid size-9 place-items-center rounded-lg text-ink-2"
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-canvas bg-primary" />
        )}
      </button>
      {open && (
        <div className="neo-card animate-pop absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-2rem))] rounded-xl p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <p className="text-2xs text-ink-2">
                {push.state === 'on'
                  ? 'Reminders on: meetings −10 min, deadlines −1 h, 10:15 daily'
                  : push.state === 'blocked'
                    ? 'Notifications are blocked in this browser’s site settings'
                    : push.state === 'needs-install'
                      ? 'On iPhone, add ಆyaama to the Home Screen to get reminders'
                      : push.state === 'unsupported'
                        ? 'This browser can’t show reminders'
                        : 'Get reminders even when ಆyaama is closed'}
              </p>
            </div>
            {push.state === 'off' && (
              <button
                type="button"
                onClick={() => void attempt(push.enable, 'Reminders are on for this device.')}
                className="rounded-lg bg-primary px-3 py-1.5 text-2xs font-medium text-white hover:bg-primary-hover active:bg-primary-active"
              >
                Turn on reminders
              </button>
            )}
            {push.state === 'on' && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void attempt(async () => {
                      if (!(await push.test())) throw new Error('No device received it.')
                    }, 'Test notification sent.')
                  }
                  className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-2xs font-medium"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => void attempt(push.disable, 'Reminders are off for this device.')}
                  className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-2xs font-medium text-error-ink"
                >
                  Turn off
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {!notifications.length && (
              <p className="py-4 text-center text-xs text-ink-3">You&apos;re all caught up.</p>
            )}
            {notifications.map((item) => (
              <div className="neo-inset flex gap-2 rounded-lg p-2.5" key={item.id}>
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-ink-3' : 'bg-primary'}`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">{item.title}</p>
                  {item.body && <p className="mt-0.5 text-2xs text-ink-2">{item.body}</p>}
                  <p className="mt-0.5 text-2xs text-ink-3">{mailDate(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
