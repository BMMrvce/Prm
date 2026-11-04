import type { Metadata } from 'next'
import { CalendarPanel } from '@/components/calendar/calendar-panel'

export const metadata: Metadata = { title: 'Calendar' }

export default function CalendarPage() {
  return (
    <div className="mt-5">
      <CalendarPanel />
    </div>
  )
}
