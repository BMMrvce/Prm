'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'
import { mailDate } from '@/lib/format'
import { useToast, useWorkspace } from '@/state/workbench-store'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()
  const { notifications, markNotificationsRead } = useWorkspace()
  const unread = notifications.filter((item) => !item.readAt).length

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Notifications are not supported by this browser.', 3500)
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      showToast('Notification permission was not granted.', 3500)
      return
    }

    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('Workbench notifications enabled', {
      body: 'Meeting reminders, task alerts, and mentions will appear here.',
      icon: '/icons/workbench-192.png',
      badge: '/icons/workbench-192.png',
      tag: 'workbench-enabled',
    })
    showToast('Popup notifications are enabled.', 3500)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) void markNotificationsRead()
          setOpen((visible) => !visible)
        }}
        className="neo-control relative grid size-9 place-items-center rounded-lg text-[#4d4d55]"
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[#f4f6fa] bg-[#493bd0]" />
        )}
      </button>
      {open && (
        <div className="neo-card absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-2rem))] rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold">Notifications</h3>
              <p className="text-[11px] text-[#73737a]">Workspace and device alerts</p>
            </div>
            <button
              type="button"
              onClick={enableNotifications}
              className="rounded-lg bg-[#493bd0] px-3 py-1.5 text-[11px] font-medium text-white"
            >
              Enable popups
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {!notifications.length && (
              <p className="py-4 text-center text-[12px] text-[#88888e]">
                You&apos;re all caught up.
              </p>
            )}
            {notifications.map((item) => (
              <div className="neo-inset flex gap-2 rounded-lg p-2.5" key={item.id}>
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-[#a9a9b0]' : 'bg-[#493bd0]'}`}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#333338]">{item.title}</p>
                  {item.body && <p className="mt-0.5 text-[11px] text-[#55555c]">{item.body}</p>}
                  <p className="mt-0.5 text-[10px] text-[#818188]">{mailDate(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
