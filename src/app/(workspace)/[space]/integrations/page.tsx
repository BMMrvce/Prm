import type { Metadata } from 'next'
import { IntegrationsList } from '@/components/integrations/integrations-list'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export const metadata: Metadata = { title: 'Integrations' }

export default async function IntegrationsPage({ params }: { params: SpaceParams }) {
  const workspace = await resolveWorkspace(params)
  return (
    <div className="mt-5">
      <IntegrationsList workspace={workspace} />
    </div>
  )
}
