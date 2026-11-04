import type { Metadata } from 'next'
import { SettingsForm } from '@/components/settings/settings-form'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({ params }: { params: SpaceParams }) {
  const workspace = await resolveWorkspace(params)
  return (
    <div className="mt-5">
      <SettingsForm workspace={workspace} />
    </div>
  )
}
