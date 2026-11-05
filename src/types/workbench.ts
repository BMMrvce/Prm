export type SpaceKey = 'office' | 'studio' | 'personal'

/** Static per-workspace configuration. Everything else is loaded from Supabase. */
export type WorkspaceData = {
  key: SpaceKey
  switchLabel: string
  /** Default name; replaced by the name stored in `workspaces` once loaded. */
  name: string
  taskPrefix: string
}

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export type Project = {
  id: string
  workspaceId: string
  name: string
  /** URL segment; shared projects get the id appended so they never clash with yours. */
  slug: string
  color: string
  status: string
  createdAt: string
  /** Owner of the workspace when someone else shared this project with you. */
  sharedBy: string | null
  /** Email domain the project is shared with, e.g. `cfoverseglobal.com`. */
  sharedDomain: string | null
  /** People tagged on the project (user ids). */
  members: string[]
}

export type WorkspaceTask = {
  id: string
  /** Human-readable id such as `WR-12`. */
  code: string
  title: string
  workspaceId: string
  projectId: string
  projectName: string | null
  state: 'open' | 'completed' | 'cancelled'
  priority: Priority
  dueAt: string | null
  estimateMinutes: number | null
  createdAt: string
  completedAt: string | null
  creatorId: string
  /** People tagged on the task (user ids). */
  assignees: string[]
  /** Owner of the workspace when the task comes from someone else's workspace. */
  sharedBy: string | null
}

export type Meeting = {
  id: string
  title: string
  startsAt: string
  endsAt: string
  location: string | null
  meetingUrl: string | null
}

export type PlanItem = {
  id: string
  title: string
  position: number
  completedAt: string | null
}

export type EntryKind = 'expense' | 'income' | 'reimbursement'

export type ExpenseRecord = {
  id: string
  kind: EntryKind
  date: string
  description: string
  category: string
  amount: number
  currency: Currency
  status: 'recorded' | 'pending' | 'approved' | 'rejected' | 'paid'
}

export type TimeEntry = {
  id: string
  workspaceId: string
  taskId: string | null
  taskTitle: string | null
  userId: string
  state: 'running' | 'paused' | 'stopped'
  startedAt: string
  endedAt: string | null
  accumulatedSeconds: number
  description: string | null
}

/** Someone who can be tagged on projects and tasks. */
export type Person = {
  id: string
  name: string
  email?: string
}

export type AppNotification = {
  id: string
  title: string
  body: string | null
  createdAt: string
  readAt: string | null
}

export type Profile = {
  id: string
  email: string
  fullName: string
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR'

/** Per-device preferences that have no column in the database. */
export type WorkspaceSettings = {
  currency: Currency
}

export type NewTaskInput = {
  title: string
  projectId?: string
  priority?: Priority
  dueAt?: string | null
  estimateMinutes?: number | null
}

export type TaskChanges = Partial<
  Pick<WorkspaceTask, 'title' | 'projectId' | 'priority' | 'dueAt' | 'estimateMinutes' | 'state'>
>

export type NewTimeLogInput = {
  taskId: string | null
  /** Local `YYYY-MM-DD` the time was spent on. */
  date: string
  minutes: number
  description?: string
}

export type NewMeetingInput = {
  title: string
  startsAt: string
  endsAt: string
  location?: string
  meetingUrl?: string
}

export type NewExpenseInput = {
  kind?: EntryKind
  description: string
  /** Local `YYYY-MM-DD`; defaults to today. */
  date?: string
  category: string
  amount: number
}
