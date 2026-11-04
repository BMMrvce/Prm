import type { Metadata } from 'next'
import { HomeView } from '@/components/dashboard/home-view'
import { resolveWorkspace, type SpaceParams } from '@/lib/workspace'

export async function generateMetadata({ params }: { params: SpaceParams }): Promise<Metadata> {
  const workspace = await resolveWorkspace(params)
  return { title: workspace.name }
}

export default function WorkspaceHomePage() {
  return <HomeView />
}
