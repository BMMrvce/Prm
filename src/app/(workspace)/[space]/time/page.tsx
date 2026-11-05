import type { Metadata } from 'next'
import { TimeDashboard } from '@/components/time/time-dashboard'

export const metadata: Metadata = { title: 'Time Management' }

export default function TimePage() {
  return (
    <div className="mt-5">
      <TimeDashboard />
    </div>
  )
}
