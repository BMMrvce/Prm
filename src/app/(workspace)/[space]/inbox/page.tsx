import type { Metadata } from 'next'
import { InboxView } from '@/components/inbox/inbox-view'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Inbox' }

export default async function InboxPage({ params }: { params: SpaceParams }) {
  const workspace = await resolveWorkspace(params)
  return (
    <div className="mt-5">
      <InboxView workspace={workspace} />
    </div>
  )
}
