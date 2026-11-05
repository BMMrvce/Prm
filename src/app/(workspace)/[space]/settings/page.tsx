import type { Metadata } from 'next'
import { SettingsForm } from '@/components/settings/settings-form'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="mt-5">
      <SettingsForm />
    </div>
  )
}
