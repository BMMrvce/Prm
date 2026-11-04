export type SpaceKey = 'office' | 'studio' | 'personal'

export type WorkspaceTask = {
  id: string
  title: string
  meta: string
  priority: 'High' | 'Medium' | 'Low'
  done?: boolean
}

export type CalendarEntry = {
  day: string
  date: string
  meeting: string
  task: string
  taskTone?: 'green' | 'blue'
}

export type WorkspaceData = {
  key: SpaceKey
  switchLabel: string
  name: string
  initials: string
  greeting: string
  alert: string
  alertMeta: string
  projects: string[]
  tasks: WorkspaceTask[]
  timer: { title: string; elapsed: string; estimate: string }
  calendar: CalendarEntry[]
  note: string
  email: string
  plan: string[]
  activity: string[]
  mailProvider: string
}

export type ExpenseRecord = {
  id: string
  date: string
  description: string
  category: string
  amount: number
  status: 'Pending' | 'Approved' | 'Paid' | 'Recorded'
}
