import type { Metadata } from 'next'
import { Suspense } from 'react'
import { InboxView } from '@/components/inbox/inbox-view'

export const metadata: Metadata = { title: 'Inbox' }

export default function InboxPage() {
  return (
    <div className="mt-5">
      {/* Reads ?search= and ?compose= (from global search), which needs a Suspense boundary. */}
      <Suspense>
        <InboxView />
      </Suspense>
    </div>
  )
}
