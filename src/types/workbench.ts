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

/** A page in Notes; `meeting` is set when it holds the notes of a meeting. */
export type Note = {
  id: string
  title: string
  /** Sanitized HTML from the Notes editor. */
  content: string
  pinned: boolean
  meetingId: string | null
  meeting: Pick<Meeting, 'id' | 'title' | 'startsAt' | 'endsAt'> | null
  /** The project it is filed under, if any. */
  projectId: string | null
  project: Pick<Project, 'name' | 'color'> | null
  /** Who wrote it; collaborators see notes owned by someone else. */
  ownerId: string
  /** People it is shared with (user ids); they can read and edit it live. */
  members: string[]
  createdAt: string
  updatedAt: string
}

export type NoteChanges = Partial<Pick<Note, 'title' | 'content' | 'pinned' | 'projectId'>>

export type PlanItem = {
  id: string
  title: string
  position: number
  completedAt: string | null
}

export type EntryKind = 'expense' | 'income' | 'reimbursement' | 'transfer'

export type ExpenseRecord = {
  id: string
  kind: EntryKind
  date: string
  description: string
  category: string
  amount: number
  currency: Currency
  status: 'recorded' | 'pending' | 'approved' | 'rejected' | 'paid'
  paymentMethod: string | null
  notes: string | null
}

export type ExpenseChanges = Partial<{
  description: string
  category: string
  amount: number
  date: string
  kind: EntryKind
  paymentMethod: string | null
  notes: string | null
}>

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

/** Theme-aware colors a meeting category can use (tokens `--cat-<color>` in globals.css). */
export type CategoryColor =
  | 'blue'
  | 'orange'
  | 'green'
  | 'violet'
  | 'pink'
  | 'teal'
  | 'amber'
  | 'slate'

/** A person or entity whose meetings get their own calendar color. */
export type MeetingCategoryConfig = {
  id: string
  /** Shown on tabs and chips; also matched in meeting titles. */
  label: string
  /** Extra words that also put a meeting in this category (e.g. initials, a company). */
  keywords: string[]
  color: CategoryColor
}

/**
 * Per-workspace preferences with no column of their own; stored in the account's metadata
 * so every browser shares them. Every field is optional and saves merge.
 */
export type WorkspaceSettings = {
  currency?: Currency
  /** Meeting color mappings; unset means the built-in defaults. */
  meetingCategories?: MeetingCategoryConfig[]
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
  paymentMethod?: string | null
  notes?: string | null
}

export type HabitCategory = 'focus' | 'reading' | 'technical' | 'health' | 'financial' | 'other'
export type HabitFrequency = 'daily' | 'weekly' | 'weekdays'
export type HabitTargetKind = 'boolean' | 'duration' | 'quantity'

export type Habit = {
  id: string
  title: string
  category: HabitCategory
  frequency: HabitFrequency
  /** Only set when frequency is `weekdays`. 0 = Sunday .. 6 = Saturday. */
  weekdays: number[] | null
  /** Only set when frequency is `weekly`: how many times a week it must be done. */
  targetPerWeek: number | null
  targetKind: HabitTargetKind
  targetValue: number | null
  targetUnit: string | null
  color: CategoryColor
  position: number
  archivedAt: string | null
  createdAt: string
}

export type NewHabitInput = {
  title: string
  category: HabitCategory
  frequency: HabitFrequency
  weekdays?: number[] | null
  targetPerWeek?: number | null
  targetKind?: HabitTargetKind
  targetValue?: number | null
  targetUnit?: string | null
  color?: CategoryColor
}

export type HabitChanges = Partial<NewHabitInput>

export type HabitEntryStatus = 'completed' | 'skipped'

export type HabitEntry = {
  id: string
  habitId: string
  /** Local `YYYY-MM-DD` the entry is for. */
  date: string
  status: HabitEntryStatus
  loggedAt: string
  note: string | null
  quantityValue: number | null
}

export type BookStatus = 'planned' | 'reading' | 'completed'

export type Book = {
  id: string
  title: string
  author: string
  status: BookStatus
  totalPages: number | null
  startedAt: string | null
  completedAt: string | null
  position: number
  coverUrl: string | null
  category: string | null
  /** Your personal rating, 1-5. */
  rating: number | null
  /** Knowledge extraction, one reflection per book (not per session). */
  learned: string | null
  interesting: string | null
  apply: string | null
  action: string | null
  /** Reading goal: pages per day. */
  pagesPerDayGoal: number | null
}

export type NewBookInput = {
  title: string
  author?: string
  status?: BookStatus
  totalPages?: number | null
  coverUrl?: string | null
  category?: string | null
  pagesPerDayGoal?: number | null
}

export type BookChanges = Partial<NewBookInput> & {
  startedAt?: string | null
  completedAt?: string | null
  rating?: number | null
  learned?: string | null
  interesting?: string | null
  apply?: string | null
  action?: string | null
}

export type ReadingSession = {
  id: string
  bookId: string
  /** Local `YYYY-MM-DD` the session happened on. */
  date: string
  pagesRead: number | null
  durationMinutes: number | null
  takeaway: string | null
  chapter: string | null
}

export type NewReadingSessionInput = {
  bookId: string
  date: string
  pagesRead?: number | null
  durationMinutes?: number | null
  takeaway?: string | null
  chapter?: string | null
}

export type FocusSession = {
  id: string
  /** Local `YYYY-MM-DD` the session happened on. */
  date: string
  durationMinutes: number
  distractionCount: number
  tasksCompleted: number
  /** Self-rated concentration, 1-5. Not a medical or clinical assessment. */
  concentrationRating: number
  note: string | null
}

export type NewFocusSessionInput = {
  date: string
  durationMinutes: number
  distractionCount?: number
  tasksCompleted?: number
  concentrationRating: number
  note?: string | null
}

export type FocusSessionChanges = Partial<Omit<NewFocusSessionInput, 'date'>>

export type LearningCategory =
  | 'system_design'
  | 'linux'
  | 'aws'
  | 'devops'
  | 'software_engineering'
  | 'software_architecture'
  | 'other'

export type LearningStatus = 'not_started' | 'learning' | 'practised' | 'mastered'

export type LearningTopic = {
  id: string
  title: string
  category: LearningCategory
  status: LearningStatus
  resources: string | null
  notes: string | null
  position: number
  archivedAt: string | null
}

export type NewLearningTopicInput = {
  title: string
  category: LearningCategory
  status?: LearningStatus
  resources?: string | null
  notes?: string | null
}

export type LearningTopicChanges = Partial<NewLearningTopicInput>

export type GoalCategory = 'career' | 'financial' | 'personal_development' | 'learning' | 'other'
export type GoalStatus = 'active' | 'completed' | 'abandoned'

export type Goal = {
  id: string
  title: string
  category: GoalCategory
  status: GoalStatus
  targetDate: string | null
  notes: string | null
  position: number
  completedAt: string | null
}

export type NewGoalInput = {
  title: string
  category: GoalCategory
  targetDate?: string | null
  notes?: string | null
}

export type GoalChanges = Partial<NewGoalInput> & { status?: GoalStatus }

export type GoalMilestone = {
  id: string
  goalId: string
  title: string
  targetDate: string | null
  completedAt: string | null
  position: number
}

export type NewMilestoneInput = {
  goalId: string
  title: string
  targetDate?: string | null
}

/** One active budget: an overall monthly limit plus a `{category: limit}` map. */
export type Budget = {
  id: string
  monthlyLimit: number | null
  categoryLimits: Record<string, number>
}

export type BudgetChanges = {
  monthlyLimit?: number | null
  categoryLimits?: Record<string, number>
}

export type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  targetDate: string | null
  position: number
  archivedAt: string | null
}

export type NewSavingsGoalInput = {
  name: string
  targetAmount: number
  targetDate?: string | null
}

export type SavingsGoalChanges = Partial<NewSavingsGoalInput>

export type ContributionDirection = 'contribution' | 'withdrawal'

export type SavingsContribution = {
  id: string
  goalId: string
  amount: number
  direction: ContributionDirection
  occurredOn: string
  note: string | null
}

export type NewContributionInput = {
  goalId: string
  amount: number
  direction: ContributionDirection
  occurredOn?: string
  note?: string | null
}

export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly'

export type RecurringPayment = {
  id: string
  name: string
  kind: 'expense' | 'income'
  category: string | null
  amount: number
  frequency: RecurringFrequency
  nextDueDate: string
  active: boolean
}

export type NewRecurringPaymentInput = {
  name: string
  kind: 'expense' | 'income'
  category?: string | null
  amount: number
  frequency: RecurringFrequency
  nextDueDate: string
}

export type RecurringPaymentChanges = Partial<NewRecurringPaymentInput> & { active?: boolean }
