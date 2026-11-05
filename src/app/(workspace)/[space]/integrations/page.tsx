import type { Metadata } from 'next'
import { Suspense } from 'react'
import { IntegrationsList } from '@/components/integrations/integrations-list'

export const metadata: Metadata = { title: 'Integrations' }

export default function IntegrationsPage() {
  return (
    <div className="mt-5">
      {/* Reads ?outlook= from the OAuth callback, which needs a Suspense boundary on static pages. */}
      <Suspense>
        <IntegrationsList />
      </Suspense>
    </div>
  )
}
