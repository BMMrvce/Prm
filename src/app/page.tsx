import { redirect } from 'next/navigation'
import { workspacePath } from '@/lib/routes'

export default function RootPage() {
  redirect(workspacePath('office'))
}
