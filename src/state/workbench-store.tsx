'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { findWorkspace, spaces, workspaceSlug } from '@/data/workspaces'
import { localDate, weekRange } from '@/lib/format'
import { isHexColor, nextProjectColor } from '@/lib/projects'
import { projectSlug } from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import type {
  AppNotification,
  Book,
  BookChanges,
  Budget,
  BudgetChanges,
  Currency,
  ExpenseChanges,
  ExpenseRecord,
  FocusSession,
  FocusSessionChanges,
  Goal,
  GoalChanges,
  GoalMilestone,
  Habit,
  HabitChanges,
  HabitEntry,
  HabitEntryStatus,
  LearningTopic,
  LearningTopicChanges,
  Meeting,
  Note,
  NoteChanges,
  NewBookInput,
  NewContributionInput,
  NewExpenseInput,
  NewFocusSessionInput,
  NewGoalInput,
  NewHabitInput,
  NewLearningTopicInput,
  NewMeetingInput,
  NewMilestoneInput,
  NewReadingSessionInput,
  NewRecurringPaymentInput,
  NewSavingsGoalInput,
  NewTaskInput,
  NewTimeLogInput,
  Person,
  PlanItem,
  Profile,
  Project,
  ReadingSession,
  RecurringFrequency,
  RecurringPayment,
  RecurringPaymentChanges,
  SavingsContribution,
  SavingsGoal,
  SavingsGoalChanges,
  SpaceKey,
  TaskChanges,
  TimeEntry,
  WorkspaceSettings,
  WorkspaceTask,
} from '@/types/workbench'

type BySpace<T> = Record<SpaceKey, T>

/** Task prefix and owner name of each workspace whose items appear in a space. */
type WorkspaceInfo = { prefix: string; sharedBy: string | null }

/**
 * Everything shown for one space, loaded from Supabase: the user's own workspace plus
 * projects and tasks other people tagged them on in their workspace for the same space.
 */
type SpaceData = {
  workspaceId: string
  name: string
  taskPrefix: string
  workspaces: Record<string, WorkspaceInfo>
  projects: Project[]
  tasks: WorkspaceTask[]
  /** Meetings of every week viewed so far; `meetingWeeks` lists the Sundays they start on. */
  meetings: Meeting[]
  meetingWeeks: string[]
  note: string
  plan: PlanItem[]
  expenses: ExpenseRecord[]
  notifications: AppNotification[]
  timeEntries: TimeEntry[]
  /** Display names by user id, for tags, shared items and time entries. */
  people: Record<string, string>
  /** False until the collaboration migration has been applied. */
  collaboration: boolean
  /** Your notes in this workspace, most recently edited first. */
  notes: Note[]
  /** False until the notes migration has been applied. */
  notesReady: boolean
  /** False until the notes projects + collaboration migration has been applied. */
  notesCollab: boolean
  habits: Habit[]
  /** Daily habit logs for the last `GROWTH_HISTORY_DAYS` days. */
  habitEntries: HabitEntry[]
  books: Book[]
  readingSessions: ReadingSession[]
  focusSessions: FocusSession[]
  /** False until the growth tracker migration has been applied. */
  growthReady: boolean
  learningTopics: LearningTopic[]
  goals: Goal[]
  goalMilestones: GoalMilestone[]
  /** False until the learning/goals migration has been applied. */
  learningGoalsReady: boolean
  /** Personal only: past daily reflections (`daily_notes`), most recent first. */
  dailyNoteHistory: { date: string; content: string }[]
  budget: Budget | null
  savingsGoals: SavingsGoal[]
  savingsContributions: SavingsContribution[]
  recurringPayments: RecurringPayment[]
  /** False until the personal finance migration has been applied. */
  financeReady: boolean
}

// Rows come from untyped PostgREST queries and are mapped to app types below.
type Row = Record<string, any>

const TASK_FIELDS =
  'id,workspace_id,task_number,title,project_id,state,priority,due_at,estimate_minutes,created_at,completed_at,creator_id,project:projects(name),assignees:task_assignees(user_id)'
// All columns, so `shared_domain` is read once its migration exists and ignored before.
const PROJECT_FIELDS = '*'
const SHARED_WORKSPACE = 'workspace:workspaces!inner(slug,task_prefix,created_by)'
const MEETING_FIELDS = 'id,title,starts_at,ends_at,location,meeting_url'
const PLAN_FIELDS = 'id,title,position,completed_at'
const NOTE_FIELDS_BASE =
  'id,user_id,title,content,pinned,meeting_id,created_at,updated_at,meeting:meetings(id,title,starts_at,ends_at)'
/** With the project link (needs 202611080001_notes_projects_collaboration.sql). */
const NOTE_FIELDS = `${NOTE_FIELDS_BASE},project_id,project:projects(name,color)`
const noteFields = (collab: boolean) => (collab ? NOTE_FIELDS : NOTE_FIELDS_BASE)
const EXPENSE_FIELDS_BASE = 'id,kind,expense_date,description,category,amount,currency,status'
/** With payment method and notes (needs 202611100004_personal_finance.sql). */
const EXPENSE_FIELDS = `${EXPENSE_FIELDS_BASE},payment_method,notes`
const BUDGET_FIELDS = 'id,monthly_limit,category_limits'
const SAVINGS_GOAL_FIELDS = 'id,name,target_amount,target_date,position,archived_at'
const SAVINGS_CONTRIBUTION_FIELDS = 'id,goal_id,amount,direction,occurred_on,note'
const RECURRING_PAYMENT_FIELDS = 'id,name,kind,category,amount,frequency,next_due_date,active'
const TIMER_FIELDS =
  'id,workspace_id,task_id,user_id,state,started_at,ended_at,accumulated_seconds,description,task:tasks(title)'
/** How far back time entries are loaded for charts and per-task totals. */
const TIME_HISTORY_DAYS = 180
const HABIT_FIELDS =
  'id,title,category,frequency,weekdays,target_per_week,target_kind,target_value,target_unit,color,position,archived_at,created_at'
const HABIT_ENTRY_FIELDS = 'id,habit_id,entry_date,status,logged_at,note,quantity_value'
const BOOK_FIELDS_BASE = 'id,title,author,status,total_pages,started_at,completed_at,position'
/** With the reading-enrichment columns (needs 202611100002_reading_focus_enrichment.sql). */
const BOOK_FIELDS = `${BOOK_FIELDS_BASE},cover_url,category,rating,learned,interesting,apply,action,pages_per_day_goal`
const READING_SESSION_FIELDS_BASE = 'id,book_id,session_date,pages_read,duration_minutes,takeaway'
const READING_SESSION_FIELDS = `${READING_SESSION_FIELDS_BASE},chapter`
const FOCUS_SESSION_FIELDS =
  'id,session_date,duration_minutes,distraction_count,tasks_completed,concentration_rating,note'
/** How far back habit entries are loaded, enough for a full GitHub-style year heatmap. */
const GROWTH_HISTORY_DAYS = 371
const GROWTH_HINT =
  'Growth tracker needs a database update: run supabase/migrations/202611100001_growth_tracker.sql in the Supabase SQL editor.'
const READING_ENRICHMENT_HINT =
  'Book covers, categories, ratings and reading goals need a database update: run supabase/migrations/202611100002_reading_focus_enrichment.sql in the Supabase SQL editor.'
const LEARNING_TOPIC_FIELDS = 'id,title,category,status,resources,notes,position,archived_at'
const GOAL_FIELDS = 'id,title,category,status,target_date,notes,position,completed_at'
const GOAL_MILESTONE_FIELDS = 'id,goal_id,title,target_date,completed_at,position'
const LEARNING_GOALS_HINT =
  'Learning & Goals need a database update: run supabase/migrations/202611100003_learning_goals.sql in the Supabase SQL editor.'
const FINANCE_HINT =
  'Budgets, savings goals and recurring payments need a database update: run supabase/migrations/202611100004_personal_finance.sql in the Supabase SQL editor.'
/** Adds one frequency interval to a `YYYY-MM-DD` day, preserving the day-of-month where possible. */
function advanceDueDate(date: string, frequency: RecurringFrequency): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  if (frequency === 'weekly') next.setDate(next.getDate() + 7)
  else if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)
  return localDate(next)
}
/** How many days of past daily reflections the Notes page can browse. */
const DAILY_NOTE_HISTORY_DAYS = 90
const SETTINGS_KEY = 'workbench-settings'
const LEGACY_KEYS = ['workbench-tasks', 'workbench-calendar', 'workbench-expenses']

const one = (value: Row | Row[] | null | undefined) => (Array.isArray(value) ? value[0] : value)

const toProject = (row: Row, sharedBy: string | null = null, members: string[] = []): Project => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  slug: sharedBy ? `${row.slug}-${String(row.id).slice(0, 6)}` : row.slug,
  color: row.color,
  status: row.status,
  createdAt: row.created_at,
  sharedBy,
  sharedDomain: row.shared_domain ?? null,
  members,
})

const toTask = (row: Row, info: WorkspaceInfo | undefined): WorkspaceTask => ({
  id: row.id,
  code: `${info?.prefix ?? 'T'}-${row.task_number}`,
  title: row.title,
  workspaceId: row.workspace_id,
  projectId: row.project_id,
  projectName: one(row.project)?.name ?? null,
  state: row.state,
  priority: row.priority,
  dueAt: row.due_at,
  estimateMinutes: row.estimate_minutes,
  createdAt: row.created_at,
  completedAt: row.completed_at,
  creatorId: row.creator_id,
  assignees: ((row.assignees ?? []) as Row[]).map((item) => item.user_id),
  sharedBy: info?.sharedBy ?? null,
})

const toMeeting = (row: Row): Meeting => ({
  id: row.id,
  title: row.title,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  location: row.location,
  meetingUrl: row.meeting_url,
})

const toNote = (row: Row, members: string[] = []): Note => {
  const meeting = one(row.meeting)
  const project = one(row.project)
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    pinned: Boolean(row.pinned),
    meetingId: row.meeting_id ?? null,
    meeting: meeting
      ? {
          id: meeting.id,
          title: meeting.title,
          startsAt: meeting.starts_at,
          endsAt: meeting.ends_at,
        }
      : null,
    projectId: row.project_id ?? null,
    project: project ? { name: project.name, color: project.color } : null,
    ownerId: row.user_id,
    members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Note fields from the app's names to database columns. */
const noteColumns = (changes: NoteChanges) => {
  const columns: Row = {}
  if (changes.title !== undefined) columns.title = changes.title
  if (changes.content !== undefined) columns.content = changes.content
  if (changes.pinned !== undefined) columns.pinned = changes.pinned
  if (changes.projectId !== undefined) columns.project_id = changes.projectId
  return columns
}

const sortNotes = (list: Note[]) =>
  [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  )

const NOTES_COLLAB_HINT =
  'Sharing notes needs a database update: run supabase/migrations/202611080001_notes_projects_collaboration.sql in the Supabase SQL editor.'

const NOTES_HINT =
  'Notes need a database update: run supabase/migrations/202611070001_notes.sql in the Supabase SQL editor.'

const toPlanItem = (row: Row): PlanItem => ({
  id: row.id,
  title: row.title,
  position: Number(row.position),
  completedAt: row.completed_at,
})

const toExpense = (row: Row): ExpenseRecord => ({
  id: row.id,
  kind: row.kind,
  date: row.expense_date,
  description: row.description,
  category: row.category,
  amount: Number(row.amount),
  currency: row.currency,
  status: row.status,
  paymentMethod: row.payment_method ?? null,
  notes: row.notes ?? null,
})

const toBudget = (row: Row): Budget => ({
  id: row.id,
  monthlyLimit: row.monthly_limit === null ? null : Number(row.monthly_limit),
  categoryLimits: Object.fromEntries(
    Object.entries((row.category_limits ?? {}) as Record<string, unknown>).map(([key, value]) => [
      key,
      Number(value),
    ]),
  ),
})

const toSavingsGoal = (row: Row): SavingsGoal => ({
  id: row.id,
  name: row.name,
  targetAmount: Number(row.target_amount),
  targetDate: row.target_date,
  position: Number(row.position),
  archivedAt: row.archived_at,
})

const toSavingsContribution = (row: Row): SavingsContribution => ({
  id: row.id,
  goalId: row.goal_id,
  amount: Number(row.amount),
  direction: row.direction,
  occurredOn: row.occurred_on,
  note: row.note,
})

const toRecurringPayment = (row: Row): RecurringPayment => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  category: row.category,
  amount: Number(row.amount),
  frequency: row.frequency,
  nextDueDate: row.next_due_date,
  active: row.active,
})

const toNotification = (row: Row): AppNotification => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
  readAt: row.read_at,
})

const toTimer = (row: Row): TimeEntry => ({
  id: row.id,
  workspaceId: row.workspace_id,
  taskId: row.task_id,
  taskTitle: one(row.task)?.title ?? null,
  userId: row.user_id,
  state: row.state,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  accumulatedSeconds: row.accumulated_seconds,
  description: row.description,
})

const toHabit = (row: Row): Habit => ({
  id: row.id,
  title: row.title,
  category: row.category,
  frequency: row.frequency,
  weekdays: row.weekdays ?? null,
  targetPerWeek: row.target_per_week ?? null,
  targetKind: row.target_kind,
  targetValue: row.target_value === null || row.target_value === undefined ? null : Number(row.target_value),
  targetUnit: row.target_unit ?? null,
  color: row.color,
  position: Number(row.position),
  archivedAt: row.archived_at ?? null,
  createdAt: row.created_at,
})

const toHabitEntry = (row: Row): HabitEntry => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.entry_date,
  status: row.status,
  loggedAt: row.logged_at,
  note: row.note ?? null,
  quantityValue:
    row.quantity_value === null || row.quantity_value === undefined ? null : Number(row.quantity_value),
})

const toBook = (row: Row): Book => ({
  id: row.id,
  title: row.title,
  author: row.author ?? '',
  status: row.status,
  totalPages: row.total_pages ?? null,
  startedAt: row.started_at ?? null,
  completedAt: row.completed_at ?? null,
  position: Number(row.position),
  coverUrl: row.cover_url ?? null,
  category: row.category ?? null,
  rating: row.rating ?? null,
  learned: row.learned ?? null,
  interesting: row.interesting ?? null,
  apply: row.apply ?? null,
  action: row.action ?? null,
  pagesPerDayGoal: row.pages_per_day_goal === null || row.pages_per_day_goal === undefined ? null : Number(row.pages_per_day_goal),
})

const toReadingSession = (row: Row): ReadingSession => ({
  id: row.id,
  bookId: row.book_id,
  date: row.session_date,
  pagesRead: row.pages_read ?? null,
  durationMinutes: row.duration_minutes ?? null,
  takeaway: row.takeaway ?? null,
  chapter: row.chapter ?? null,
})

const toFocusSession = (row: Row): FocusSession => ({
  id: row.id,
  date: row.session_date,
  durationMinutes: row.duration_minutes,
  distractionCount: row.distraction_count,
  tasksCompleted: row.tasks_completed,
  concentrationRating: row.concentration_rating,
  note: row.note ?? null,
})

const toLearningTopic = (row: Row): LearningTopic => ({
  id: row.id,
  title: row.title,
  category: row.category,
  status: row.status,
  resources: row.resources ?? null,
  notes: row.notes ?? null,
  position: Number(row.position),
  archivedAt: row.archived_at ?? null,
})

const toGoal = (row: Row): Goal => ({
  id: row.id,
  title: row.title,
  category: row.category,
  status: row.status,
  targetDate: row.target_date ?? null,
  notes: row.notes ?? null,
  position: Number(row.position),
  completedAt: row.completed_at ?? null,
})

const toGoalMilestone = (row: Row): GoalMilestone => ({
  id: row.id,
  goalId: row.goal_id,
  title: row.title,
  targetDate: row.target_date ?? null,
  completedAt: row.completed_at ?? null,
  position: Number(row.position),
})

/** The 16 suggested starter habits across the 5 requested categories; editable/removable after seeding. */
const DEFAULT_HABITS: Array<{
  title: string
  category: Habit['category']
  frequency: Habit['frequency']
  weekdays?: number[]
  targetPerWeek?: number
  targetKind?: Habit['targetKind']
  targetValue?: number
  targetUnit?: string
  color: Habit['color']
}> = [
  // Focus & Productivity
  {
    title: '45 minutes of uninterrupted deep work',
    category: 'focus',
    frequency: 'daily',
    targetKind: 'duration',
    targetValue: 45,
    targetUnit: 'minutes',
    color: 'blue',
  },
  { title: 'No unnecessary phone usage during work', category: 'focus', frequency: 'daily', color: 'blue' },
  {
    title: 'Complete three priority tasks',
    category: 'focus',
    frequency: 'daily',
    targetKind: 'quantity',
    targetValue: 3,
    targetUnit: 'tasks',
    color: 'blue',
  },
  { title: "Review the day's productivity", category: 'focus', frequency: 'daily', color: 'blue' },
  // Reading
  {
    title: 'Read for 20 minutes',
    category: 'reading',
    frequency: 'daily',
    targetKind: 'duration',
    targetValue: 20,
    targetUnit: 'minutes',
    color: 'violet',
  },
  { title: 'Write one takeaway from the reading session', category: 'reading', frequency: 'daily', color: 'violet' },
  // Technical Growth
  {
    title: 'Study system design',
    category: 'technical',
    frequency: 'daily',
    targetKind: 'duration',
    targetValue: 30,
    targetUnit: 'minutes',
    color: 'teal',
  },
  { title: 'Practise Linux', category: 'technical', frequency: 'weekdays', weekdays: [1, 2, 3, 4, 5], color: 'teal' },
  { title: 'Learn AWS and DevOps concepts', category: 'technical', frequency: 'weekly', targetPerWeek: 3, color: 'teal' },
  {
    title: 'Build or improve a personal technical project',
    category: 'technical',
    frequency: 'weekly',
    targetPerWeek: 2,
    color: 'teal',
  },
  // Health
  {
    title: 'Exercise or walk',
    category: 'health',
    frequency: 'daily',
    targetKind: 'duration',
    targetValue: 20,
    targetUnit: 'minutes',
    color: 'green',
  },
  { title: 'Maintain a consistent sleep schedule', category: 'health', frequency: 'daily', color: 'green' },
  {
    title: 'Drink sufficient water',
    category: 'health',
    frequency: 'daily',
    targetKind: 'quantity',
    targetValue: 2,
    targetUnit: 'liters',
    color: 'green',
  },
  // Financial Discipline
  { title: 'Record daily expenses', category: 'financial', frequency: 'daily', color: 'amber' },
  { title: 'Avoid unnecessary purchases', category: 'financial', frequency: 'daily', color: 'amber' },
  { title: 'Review savings progress', category: 'financial', frequency: 'weekly', targetPerWeek: 1, color: 'amber' },
]

const DEFAULT_BOOKS = [
  { title: 'Deep Work', author: 'Cal Newport' },
  { title: 'Psycho-Cybernetics', author: 'Maxwell Maltz' },
  { title: 'The Psychology of Money', author: 'Morgan Housel' },
]

/** One-time seed of starter habits and books for a freshly migrated workspace. */
async function seedDefaultGrowthData(supabase: SupabaseClient, workspaceId: string, userId: string) {
  const habitRows = DEFAULT_HABITS.map((habit, index) => ({
    workspace_id: workspaceId,
    user_id: userId,
    title: habit.title,
    category: habit.category,
    frequency: habit.frequency,
    weekdays: habit.weekdays ?? null,
    target_per_week: habit.targetPerWeek ?? null,
    target_kind: habit.targetKind ?? 'boolean',
    target_value: habit.targetValue ?? null,
    target_unit: habit.targetUnit ?? null,
    color: habit.color,
    position: (index + 1) * 1000,
  }))
  const bookRows = DEFAULT_BOOKS.map((book, index) => ({
    workspace_id: workspaceId,
    user_id: userId,
    title: book.title,
    author: book.author,
    status: 'planned',
    position: (index + 1) * 1000,
  }))
  const [habits, books] = await Promise.all([
    supabase.from('habits').insert(habitRows).select(HABIT_FIELDS),
    // Base fields only: seeding must not depend on the later reading-enrichment migration.
    supabase.from('books').insert(bookRows).select(BOOK_FIELDS_BASE),
  ])
  // Marked last, after both inserts succeed, so a failed/interrupted seed just retries next load.
  await supabase.from('workspaces').update({ growth_seeded_at: new Date().toISOString() }).eq('id', workspaceId)
  return { habits: (check(habits) ?? []).map(toHabit), books: (check(books) ?? []).map(toBook) }
}

/** PostgREST error for a table or function that does not exist yet (migration not run). */
const missingFromSchema = (error: { code?: string; message: string } | null) =>
  Boolean(
    error && (error.code === 'PGRST205' || error.code === 'PGRST202' || error.code === '42P01'),
  )

const MIGRATION_HINT =
  'Run supabase/migrations/202611050002_collaboration_time_income.sql in the Supabase SQL editor to turn this on.'

const DOMAIN_HINT =
  'Sharing with your domain needs a database update: run supabase/migrations/202611050002_collaboration_time_income.sql and then 202611050003_domain_sharing.sql in the Supabase SQL editor.'

/** PostgREST error for writing a column that does not exist yet. */
const missingColumn = (error: { code?: string; message: string } | null) =>
  Boolean(error && (error.code === 'PGRST204' || error.code === '42703'))

const sortMeetings = (list: Meeting[]) =>
  [...new Map(list.map((meeting) => [meeting.id, meeting])).values()].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

/** Like `check` for `.single()` writes, which must return the affected row. */
function checkRow<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  const row = check(result)
  if (!row) throw new Error('The database did not return the saved row.')
  return row
}

/** Finds the user's database workspace for a space, creating it on first visit. */
async function ensureWorkspace(supabase: SupabaseClient, space: SpaceKey, userId: string) {
  const slug = workspaceSlug(space, userId)
  const find = () =>
    supabase
      .from('workspaces')
      .select('id,name,task_prefix,growth_seeded_at')
      .eq('slug', slug)
      .maybeSingle()
  const existing = check(await find())
  if (existing) return existing as Row
  const created = await supabase.rpc('create_workspace', {
    workspace_name: spaces[space].name,
    workspace_slug: slug,
    prefix: spaces[space].taskPrefix,
  })
  if (!created.error) return created.data as Row
  // Another tab may have created it at the same moment.
  const retry = check(await find())
  if (retry) return retry as Row
  throw new Error(created.error.message)
}

async function loadSpace(
  supabase: SupabaseClient,
  space: SpaceKey,
  userId: string,
): Promise<SpaceData> {
  const workspace = await ensureWorkspace(supabase, space, userId)
  const id = workspace.id as string
  const [weekStart, weekEnd] = weekRange()
  const today = localDate()
  // Other people's workspaces for the same space, e.g. their Office for your Office.
  const sameSpace = `${space}-%`
  const since = new Date(Date.now() - TIME_HISTORY_DAYS * 86_400_000).toISOString()
  const growthSince = new Date(Date.now() - GROWTH_HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10)
  const [
    projects,
    tasks,
    meetings,
    note,
    plan,
    expenses,
    notifications,
    sharedProjects,
    sharedTasks,
    memberships,
    entries,
    noteRows,
    habitRows,
    habitEntryRows,
    bookRows,
    readingSessionRows,
    focusSessionRows,
    learningRows,
    goalRows,
    goalMilestoneRows,
    budgetRows,
    savingsGoalRows,
    savingsContributionRows,
    recurringPaymentRows,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(PROJECT_FIELDS)
      .eq('workspace_id', id)
      .neq('status', 'archived')
      .order('created_at'),
    supabase
      .from('tasks')
      .select(TASK_FIELDS)
      .eq('workspace_id', id)
      .neq('state', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('meetings')
      .select(MEETING_FIELDS)
      .eq('workspace_id', id)
      .gte('starts_at', weekStart.toISOString())
      .lt('starts_at', weekEnd.toISOString())
      .order('starts_at'),
    supabase
      .from('daily_notes')
      .select('content')
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .eq('note_date', today)
      .maybeSingle(),
    supabase
      .from('plan_items')
      .select(PLAN_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .eq('plan_date', today)
      .order('position'),
    supabase
      .from('expense_entries')
      .select(EXPENSE_FIELDS)
      .eq('workspace_id', id)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('notifications')
      .select('id,title,body,created_at,read_at,workspace:workspaces!inner(slug)')
      .eq('user_id', userId)
      .like('workspace.slug', sameSpace)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('projects')
      .select(`${PROJECT_FIELDS},${SHARED_WORKSPACE}`)
      .neq('workspace_id', id)
      .like('workspace.slug', sameSpace)
      .neq('status', 'archived')
      .order('created_at'),
    supabase
      .from('tasks')
      .select(`${TASK_FIELDS},${SHARED_WORKSPACE}`)
      .neq('workspace_id', id)
      .like('workspace.slug', sameSpace)
      .neq('state', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(300),
    // Tags on your projects plus the projects you were tagged on.
    supabase.from('project_members').select('project_id,user_id'),
    supabase
      .from('time_entries')
      .select(TIMER_FIELDS)
      .eq('workspace_id', id)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(2000),
    supabase
      .from('notes')
      .select(NOTE_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase.from('habits').select(HABIT_FIELDS).eq('workspace_id', id).eq('user_id', userId).order('position'),
    supabase
      .from('habit_entries')
      .select(HABIT_ENTRY_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .gte('entry_date', growthSince),
    supabase.from('books').select(BOOK_FIELDS).eq('workspace_id', id).eq('user_id', userId).order('position'),
    supabase
      .from('reading_sessions')
      .select(READING_SESSION_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .gte('session_date', since.slice(0, 10)),
    supabase
      .from('focus_sessions')
      .select(FOCUS_SESSION_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .gte('session_date', since.slice(0, 10)),
    supabase
      .from('learning_topics')
      .select(LEARNING_TOPIC_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('position'),
    supabase.from('goals').select(GOAL_FIELDS).eq('workspace_id', id).eq('user_id', userId).order('position'),
    supabase
      .from('goal_milestones')
      .select(GOAL_MILESTONE_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('position'),
    supabase.from('budgets').select(BUDGET_FIELDS).eq('workspace_id', id).eq('user_id', userId).maybeSingle(),
    supabase
      .from('savings_goals')
      .select(SAVINGS_GOAL_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('position'),
    supabase
      .from('savings_contributions')
      .select(SAVINGS_CONTRIBUTION_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('occurred_on', { ascending: false }),
    supabase
      .from('recurring_payments')
      .select(RECURRING_PAYMENT_FIELDS)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('next_due_date'),
  ])
  // Before the notes migration the table is missing; everything else still loads.
  const notesReady = !missingFromSchema(noteRows.error)
  // Before the projects + collaboration migration, fall back to the basic note fields.
  // Typed loosely: the fallback query returns fewer columns.
  let ownNotes: { data: Row[] | null; error: { code?: string; message: string } | null } = noteRows
  let notesCollab = notesReady
  if (
    notesReady &&
    noteRows.error &&
    (missingColumn(noteRows.error) || noteRows.error.code === 'PGRST200')
  ) {
    notesCollab = false
    ownNotes = await supabase
      .from('notes')
      .select(NOTE_FIELDS_BASE)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(500)
  }
  // Collaborators of every note you can see, and notes others shared with you in this space.
  let noteMemberRows: Row[] = []
  let sharedNoteRows: Row[] = []
  if (notesCollab) {
    const members = await supabase.from('note_members').select('note_id,user_id')
    if (missingFromSchema(members.error)) {
      notesCollab = false
    } else {
      noteMemberRows = (check(members) ?? []) as Row[]
      const ownIds = new Set(((check(ownNotes) ?? []) as Row[]).map((row) => row.id as string))
      const sharedIds = noteMemberRows
        .filter((row) => row.user_id === userId && !ownIds.has(row.note_id))
        .map((row) => row.note_id as string)
      if (sharedIds.length) {
        sharedNoteRows = (check(
          await supabase
            .from('notes')
            .select(`${NOTE_FIELDS},workspace:workspaces!inner(slug)`)
            .in('id', sharedIds)
            .like('workspace.slug', sameSpace)
            .order('updated_at', { ascending: false }),
        ) ?? []) as Row[]
      }
    }
  }
  const membersOfNote = (note: string) =>
    noteMemberRows.filter((row) => row.note_id === note).map((row) => row.user_id as string)

  const collaboration = !missingFromSchema(memberships.error)
  const memberRows = (collaboration ? check(memberships) : []) as Row[]
  const sharedProjectRows = (check(sharedProjects) ?? []) as Row[]
  const sharedTaskRows = (check(sharedTasks) ?? []) as Row[]
  const ownerIds = [...sharedProjectRows, ...sharedTaskRows].map(
    (row) => one(row.workspace)!.created_by as string,
  )

  // Time on shared tasks is logged in their owner's workspace.
  const sharedTaskIds = sharedTaskRows.map((row) => row.id as string)
  const sharedEntries = sharedTaskIds.length
    ? check(
        await supabase
          .from('time_entries')
          .select(TIMER_FIELDS)
          .in('task_id', sharedTaskIds)
          .gte('started_at', since)
          .limit(2000),
      )
    : []
  const timeEntries = [...(check(entries) ?? []), ...(sharedEntries ?? [])].map(toTimer)

  const ownTaskRows = (check(tasks) ?? []) as Row[]
  const personIds = new Set<string>([
    ...ownerIds,
    ...memberRows.map((row) => row.user_id as string),
    ...[...ownTaskRows, ...sharedTaskRows].flatMap((row) =>
      ((row.assignees ?? []) as Row[]).map((item) => item.user_id as string),
    ),
    ...timeEntries.map((entry) => entry.userId),
    ...noteMemberRows.map((row) => row.user_id as string),
    ...sharedNoteRows.map((row) => row.user_id as string),
  ])
  personIds.delete(userId)
  const profiles = personIds.size
    ? (check(
        await supabase
          .from('profiles')
          .select('id,full_name')
          .in('id', [...personIds]),
      ) ?? [])
    : []
  const people: Record<string, string> = {}
  for (const row of profiles as Row[]) people[row.id] = row.full_name || 'Unnamed'
  const nameOf = (person: string) => people[person] ?? 'Someone'

  const prefix = workspace.task_prefix as string
  const workspaces: Record<string, WorkspaceInfo> = { [id]: { prefix, sharedBy: null } }
  for (const row of [...sharedProjectRows, ...sharedTaskRows]) {
    const owner = one(row.workspace)!
    workspaces[row.workspace_id] = { prefix: owner.task_prefix, sharedBy: nameOf(owner.created_by) }
  }

  const membersOf = (project: string) =>
    memberRows.filter((row) => row.project_id === project).map((row) => row.user_id as string)
  const myProjects = new Set(
    memberRows.filter((row) => row.user_id === userId).map((row) => row.project_id),
  )

  // Before the growth tracker migration, these tables are missing; everything else still loads.
  const growthReady = !missingFromSchema(habitRows.error)
  // Before the reading-enrichment migration, `books`/`reading_sessions` are missing their new
  // columns; fall back to the base fields so Habits/Reading/Focus keep working regardless.
  // Rows may lack the enrichment columns when falling back; the mappers already read every
  // field defensively (`row.x ?? null`), so the wider type here is a formality, not a risk.
  let bookResult = bookRows
  if (growthReady && missingColumn(bookRows.error)) {
    bookResult = (await supabase
      .from('books')
      .select(BOOK_FIELDS_BASE)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .order('position')) as typeof bookRows
  }
  let readingSessionResult = readingSessionRows
  if (growthReady && missingColumn(readingSessionRows.error)) {
    readingSessionResult = (await supabase
      .from('reading_sessions')
      .select(READING_SESSION_FIELDS_BASE)
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .gte('session_date', since.slice(0, 10))) as typeof readingSessionRows
  }
  let habits = growthReady ? (check(habitRows) ?? []).map(toHabit) : []
  let books = growthReady ? (check(bookResult) ?? []).map(toBook) : []
  if (growthReady && !workspace.growth_seeded_at) {
    const seeded = await seedDefaultGrowthData(supabase, id, userId)
    habits = seeded.habits
    books = seeded.books
  }
  const habitEntries = growthReady ? (check(habitEntryRows) ?? []).map(toHabitEntry) : []
  const readingSessions = growthReady ? (check(readingSessionResult) ?? []).map(toReadingSession) : []
  const focusSessions = growthReady ? (check(focusSessionRows) ?? []).map(toFocusSession) : []

  // Before the learning/goals migration, these tables are missing; everything else still loads.
  const learningGoalsReady = !missingFromSchema(learningRows.error)
  const learningTopics = learningGoalsReady ? (check(learningRows) ?? []).map(toLearningTopic) : []
  const goals = learningGoalsReady ? (check(goalRows) ?? []).map(toGoal) : []
  const goalMilestones = learningGoalsReady ? (check(goalMilestoneRows) ?? []).map(toGoalMilestone) : []

  // Before the personal finance migration, expense_entries has no payment_method column yet;
  // fall back to the base fields so Office/Studio's (and pre-migration Personal's) load never fails.
  let expenseResult = expenses
  if (missingColumn(expenses.error)) {
    expenseResult = (await supabase
      .from('expense_entries')
      .select(EXPENSE_FIELDS_BASE)
      .eq('workspace_id', id)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)) as typeof expenses
  }

  // Before the personal finance migration, these tables are missing; everything else still loads.
  const financeReady = !missingFromSchema(budgetRows.error)
  const budgetRow = financeReady ? (check(budgetRows) as Row | null) : null
  const budget: Budget | null = budgetRow ? toBudget(budgetRow) : null
  const savingsGoals = financeReady ? (check(savingsGoalRows) ?? []).map(toSavingsGoal) : []
  const savingsContributions = financeReady
    ? (check(savingsContributionRows) ?? []).map(toSavingsContribution)
    : []
  const recurringPayments = financeReady
    ? (check(recurringPaymentRows) ?? []).map(toRecurringPayment)
    : []

  // Personal only: a browsable history of past daily reflections, for the Notes page.
  // Gated so Office/Studio's load never runs this extra query.
  let dailyNoteHistory: { date: string; content: string }[] = []
  if (space === 'personal') {
    const historySince = new Date(Date.now() - DAILY_NOTE_HISTORY_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const historyRows = await supabase
      .from('daily_notes')
      .select('note_date,content')
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .gte('note_date', historySince)
      .neq('note_date', today)
      .order('note_date', { ascending: false })
    dailyNoteHistory = ((check(historyRows) ?? []) as Row[])
      .filter((row) => (row.content ?? '').trim())
      .map((row) => ({ date: row.note_date, content: row.content }))
  }

  return {
    workspaceId: id,
    name: workspace.name,
    taskPrefix: prefix,
    workspaces,
    projects: [
      ...(check(projects) ?? []).map((row) => toProject(row, null, membersOf(row.id))),
      // Projects you only see through a tagged task stay out of the list; tasks carry their name.
      // Projects shared with your email domain are listed like tagged ones.
      ...sharedProjectRows
        .filter((row) => myProjects.has(row.id) || row.shared_domain)
        .map((row) => toProject(row, workspaces[row.workspace_id].sharedBy, membersOf(row.id))),
    ],
    tasks: [...ownTaskRows, ...sharedTaskRows]
      .map((row) => toTask(row, workspaces[row.workspace_id]))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    meetings: (check(meetings) ?? []).map(toMeeting),
    meetingWeeks: [localDate(weekStart)],
    note: (check(note) as Row | null)?.content ?? '',
    plan: (check(plan) ?? []).map(toPlanItem),
    expenses: (check(expenseResult) ?? []).map(toExpense),
    notifications: (check(notifications) ?? []).map(toNotification),
    timeEntries,
    people,
    collaboration,
    notes: notesReady
      ? sortNotes(
          [...((check(ownNotes) ?? []) as Row[]), ...sharedNoteRows].map((row) =>
            toNote(row, membersOfNote(row.id)),
          ),
        )
      : [],
    notesReady,
    notesCollab,
    dailyNoteHistory,
    habits,
    habitEntries,
    books,
    readingSessions,
    focusSessions,
    growthReady,
    learningTopics,
    goals,
    goalMilestones,
    learningGoalsReady,
    budget,
    savingsGoals,
    savingsContributions,
    recurringPayments,
    financeReady,
  }
}

/** Settings from before they moved to the account; read once to carry them over. */
function readLegacySettings(): Partial<BySpace<WorkspaceSettings>> {
  try {
    return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Currency used until the user picks another one in Settings. */
export const DEFAULT_CURRENCY: Currency = 'INR'

type WorkbenchState = ReturnType<typeof useWorkbenchState>

const WorkbenchContext = createContext<WorkbenchState | null>(null)

function useWorkbenchState() {
  const router = useRouter()
  const params = useParams<{ space?: string }>()
  const activeSpace = params.space ? findWorkspace(params.space)?.key : undefined
  const [supabase] = useState(() => createClient())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [spaceData, setSpaceData] = useState<Partial<BySpace<SpaceData>>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimeEntry | null>(null)
  const [settings, setSettings] = useState<Partial<BySpace<WorkspaceSettings>>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const dataRef = useRef(spaceData)
  dataRef.current = spaceData
  const loading = useRef(new Set<SpaceKey>())
  const loadingWeeks = useRef(new Set<string>())

  const showToast = useCallback((message: string, durationMs = 2500) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), durationMs)
  }, [])

  // Signed-in user, profile and any running timer.
  useEffect(() => {
    // Drop the seeded data earlier versions kept in localStorage; Supabase is the source now.
    try {
      for (const key of LEGACY_KEYS) window.localStorage.removeItem(key)
    } catch {
      // Storage unavailable: nothing to clean up.
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/login')
        return
      }
      const user = data.user
      const [profileRow, timerRow] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('time_entries')
          .select(TIMER_FIELDS)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .in('state', ['running', 'paused'])
          .maybeSingle(),
      ])
      if (cancelled) return
      setProfile({
        id: user.id,
        email: user.email ?? '',
        fullName:
          profileRow.data?.full_name ||
          (user.user_metadata?.full_name as string) ||
          user.email ||
          '',
      })
      if (timerRow.data) setTimer(toTimer(timerRow.data))
      // Settings live in the account's metadata so every browser and the PWA share them.
      const saved = user.user_metadata?.settings as Partial<BySpace<WorkspaceSettings>> | undefined
      const legacy = readLegacySettings()
      setSettings({ ...legacy, ...saved })
      if (!saved && Object.keys(legacy).length) {
        void supabase.auth.updateUser({ data: { settings: legacy } })
      }
      try {
        window.localStorage.removeItem(SETTINGS_KEY)
      } catch {
        // Storage blocked: nothing to clean up.
      }
    })()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [router, supabase])

  const reload = useCallback(
    async (space: SpaceKey) => {
      if (!profile || loading.current.has(space)) return
      loading.current.add(space)
      try {
        const data = await loadSpace(supabase, space, profile.id)
        setSpaceData((current) => ({ ...current, [space]: data }))
        setLoadError(null)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not load workspace data.')
      } finally {
        loading.current.delete(space)
      }
    },
    [profile, supabase],
  )

  // New bell entries (reminders, tags) arrive live; RLS limits them to this user's rows.
  const userId = profile?.id
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (change) => {
          const row = change.new as Row
          const notification = toNotification(row)
          setSpaceData((current) => {
            const next = { ...current }
            for (const key of Object.keys(next) as SpaceKey[]) {
              const data = next[key]!
              const belongs =
                data.workspaceId === row.workspace_id || Boolean(data.workspaces[row.workspace_id])
              if (belongs && !data.notifications.some((item) => item.id === notification.id)) {
                next[key] = { ...data, notifications: [notification, ...data.notifications] }
              }
            }
            return next
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  // Load the workspace in the URL the first time it is visited.
  useEffect(() => {
    if (activeSpace && profile && !dataRef.current[activeSpace]) void reload(activeSpace)
  }, [activeSpace, profile, reload])

  const update = (space: SpaceKey, change: (data: SpaceData) => SpaceData) =>
    setSpaceData((current) => {
      const data = current[space]
      return data ? { ...current, [space]: change(data) } : current
    })

  /** Runs a write and reports failures as a toast; resolves to false on error. */
  const run = async (action: () => Promise<void>, success?: string) => {
    try {
      await action()
      if (success) showToast(success)
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Something went wrong.', 4500)
      return false
    }
  }

  const requireData = (space: SpaceKey) => {
    const data = dataRef.current[space]
    if (!data || !profile) throw new Error('Workspace is still loading.')
    return { data, userId: profile.id }
  }

  const insertProject = async (
    space: SpaceKey,
    name: string,
    sharedDomain: string | null = null,
  ) => {
    const { data, userId } = requireData(space)
    const base = projectSlug(name) || 'project'
    const taken = new Set(data.projects.map((project) => project.slug))
    let slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    const result = await supabase
      .from('projects')
      .insert({
        workspace_id: data.workspaceId,
        name,
        slug,
        created_by: userId,
        // A color no other project uses yet, so projects are told apart at a glance.
        color: nextProjectColor(data.projects.map((project) => project.color)),
        ...(sharedDomain ? { shared_domain: sharedDomain } : {}),
      })
      .select(PROJECT_FIELDS)
      .single()
    if (sharedDomain && missingColumn(result.error)) throw new Error(DOMAIN_HINT)
    const project = toProject(checkRow(result))
    update(space, (current) => ({ ...current, projects: [...current.projects, project] }))
    return project
  }

  /** Tasks must belong to a project; quick-add uses a "General" project created on demand. */
  const generalProject = async (space: SpaceKey) => {
    const { data } = requireData(space)
    return (
      data.projects.find((project) => project.slug === 'general' && !project.sharedBy) ??
      (await insertProject(space, 'General'))
    )
  }

  const findTask = (space: SpaceKey, id: string) => {
    const { data } = requireData(space)
    const task = data.tasks.find((item) => item.id === id)
    if (!task) throw new Error('Task not found.')
    return { data, task }
  }

  const putTask = (space: SpaceKey, task: WorkspaceTask) =>
    update(space, (current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? task : item)),
    }))

  const rememberPeople = (space: SpaceKey, people: Person[]) =>
    update(space, (current) => ({
      ...current,
      people: {
        ...current.people,
        ...Object.fromEntries(people.map((person) => [person.id, person.name])),
      },
    }))

  const requireCollaboration = (space: SpaceKey) => {
    if (!requireData(space).data.collaboration) throw new Error(MIGRATION_HINT)
  }

  /** Stops the running timer and records its final duration. */
  const finishTimer = async (entry: TimeEntry) => {
    const elapsed = Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 1000)
    const stopped: TimeEntry = {
      ...entry,
      state: 'stopped',
      endedAt: new Date().toISOString(),
      accumulatedSeconds: entry.accumulatedSeconds + (entry.state === 'running' ? elapsed : 0),
    }
    check(
      await supabase
        .from('time_entries')
        .update({
          state: stopped.state,
          ended_at: stopped.endedAt,
          accumulated_seconds: stopped.accumulatedSeconds,
        })
        .eq('id', entry.id),
    )
    setTimer(null)
    replaceEntry(entry.id, [stopped])
  }

  /** Swaps a time entry (in whichever space shows it) for `entries`, newest first. */
  const replaceEntry = (id: string, entries: TimeEntry[]) =>
    setSpaceData((current) => {
      const next = { ...current }
      for (const key of Object.keys(next) as SpaceKey[]) {
        const data = next[key]!
        if (data.timeEntries.some((item) => item.id === id)) {
          next[key] = {
            ...data,
            timeEntries: data.timeEntries.flatMap((item) => (item.id === id ? entries : [item])),
          }
        }
      }
      return next
    })

  /** People matching a name or email, for the tag picker. Stable so effects can depend on it. */
  const searchPeople = useCallback(
    async (term: string): Promise<Person[]> => {
      const result = await supabase.rpc('search_people', { term })
      if (missingFromSchema(result.error)) throw new Error(MIGRATION_HINT)
      return ((check(result) ?? []) as Row[]).map((row) => ({
        id: row.id,
        name: row.full_name || row.email,
        email: row.email,
      }))
    },
    [supabase],
  )

  const actions = {
    reload,
    showToast,

    /** `sharedDomain` shares the project with every account on that email domain. */
    addProject: (space: SpaceKey, name: string, sharedDomain: string | null = null) =>
      run(
        async () => {
          await insertProject(space, name, sharedDomain)
        },
        sharedDomain ? `Project created and shared with @${sharedDomain}.` : 'Project created.',
      ),

    setProjectDomain: (space: SpaceKey, projectId: string, sharedDomain: string | null) =>
      run(
        async () => {
          const result = await supabase
            .from('projects')
            .update({ shared_domain: sharedDomain })
            .eq('id', projectId)
            .select(PROJECT_FIELDS)
            .single()
          if (missingColumn(result.error)) throw new Error(DOMAIN_HINT)
          const row = checkRow(result)
          update(space, (current) => ({
            ...current,
            projects: current.projects.map((item) =>
              item.id === projectId ? { ...item, sharedDomain: row.shared_domain ?? null } : item,
            ),
          }))
        },
        sharedDomain ? `Shared with everyone @${sharedDomain}.` : 'Domain sharing turned off.',
      ),

    setProjectColor: (space: SpaceKey, projectId: string, color: string) =>
      run(async () => {
        if (!isHexColor(color)) throw new Error('Pick a color like #2563eb.')
        const row = checkRow(
          await supabase
            .from('projects')
            .update({ color })
            .eq('id', projectId)
            .select(PROJECT_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === projectId ? { ...item, color: row.color } : item,
          ),
        }))
      }),

    addTask: (space: SpaceKey, input: NewTaskInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const project = input.projectId
          ? data.projects.find((item) => item.id === input.projectId)
          : await generalProject(space)
        if (!project) throw new Error('Project not found.')
        // Tasks in a shared project live in that project's workspace.
        const row = checkRow(
          await supabase
            .from('tasks')
            .insert({
              workspace_id: project.workspaceId,
              project_id: project.id,
              title: input.title,
              priority: input.priority ?? 'none',
              due_at: input.dueAt ?? null,
              estimate_minutes: input.estimateMinutes ?? null,
              creator_id: userId,
            })
            .select(TASK_FIELDS)
            .single(),
        )
        const task = toTask(row, data.workspaces[project.workspaceId])
        update(space, (current) => ({ ...current, tasks: [task, ...current.tasks] }))
      }, 'Task added.'),

    toggleTask: (space: SpaceKey, id: string) =>
      run(async () => {
        const { data, task } = findTask(space, id)
        const state = task.state === 'completed' ? 'open' : 'completed'
        putTask(space, { ...task, state })
        const result = await supabase
          .from('tasks')
          .update({ state })
          .eq('id', id)
          .select(TASK_FIELDS)
          .single()
        if (result.error) {
          putTask(space, task)
          throw new Error(result.error.message)
        }
        putTask(space, toTask(result.data, data.workspaces[task.workspaceId]))
      }),

    updateTask: (space: SpaceKey, id: string, changes: TaskChanges) =>
      run(async () => {
        const { data, task } = findTask(space, id)
        const columns: Row = {}
        if (changes.title !== undefined) columns.title = changes.title
        if (changes.projectId !== undefined) columns.project_id = changes.projectId
        if (changes.priority !== undefined) columns.priority = changes.priority
        if (changes.dueAt !== undefined) columns.due_at = changes.dueAt
        if (changes.estimateMinutes !== undefined)
          columns.estimate_minutes = changes.estimateMinutes
        if (changes.state !== undefined) columns.state = changes.state
        const row = checkRow(
          await supabase.from('tasks').update(columns).eq('id', id).select(TASK_FIELDS).single(),
        )
        putTask(space, toTask(row, data.workspaces[task.workspaceId]))
      }, 'Task saved.'),

    deleteTask: (space: SpaceKey, id: string) =>
      run(async () => {
        const result = check(await supabase.from('tasks').delete().eq('id', id).select('id'))
        if (!result?.length)
          throw new Error('Only the task creator or a workspace owner can delete it.')
        update(space, (current) => ({
          ...current,
          tasks: current.tasks.filter((item) => item.id !== id),
        }))
      }, 'Task deleted.'),

    tagTask: (space: SpaceKey, id: string, person: Person) =>
      run(async () => {
        requireCollaboration(space)
        const { task } = findTask(space, id)
        if (task.assignees.includes(person.id)) return
        check(
          await supabase
            .from('task_assignees')
            .insert({ task_id: id, workspace_id: task.workspaceId, user_id: person.id }),
        )
        rememberPeople(space, [person])
        putTask(space, { ...task, assignees: [...task.assignees, person.id] })
      }, `Tagged ${person.name}.`),

    untagTask: (space: SpaceKey, id: string, userId: string) =>
      run(async () => {
        const { task } = findTask(space, id)
        check(
          await supabase.from('task_assignees').delete().eq('task_id', id).eq('user_id', userId),
        )
        putTask(space, { ...task, assignees: task.assignees.filter((item) => item !== userId) })
      }),

    tagProject: (space: SpaceKey, projectId: string, person: Person) =>
      run(async () => {
        requireCollaboration(space)
        const { data, userId } = requireData(space)
        const project = data.projects.find((item) => item.id === projectId)
        if (!project || project.members.includes(person.id)) return
        check(
          await supabase.from('project_members').insert({
            project_id: projectId,
            workspace_id: project.workspaceId,
            user_id: person.id,
            added_by: userId,
          }),
        )
        rememberPeople(space, [person])
        update(space, (current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === projectId ? { ...item, members: [...item.members, person.id] } : item,
          ),
        }))
      }, `Shared with ${person.name}.`),

    untagProject: (space: SpaceKey, projectId: string, userId: string) =>
      run(async () => {
        check(
          await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId),
        )
        update(space, (current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === projectId
              ? { ...item, members: item.members.filter((member) => member !== userId) }
              : item,
          ),
        }))
      }),

    searchPeople,

    /** Loads the meetings of the week starting on `weekStart` unless they are already loaded. */
    loadWeek: async (space: SpaceKey, weekStart: Date) => {
      const key = `${space}:${localDate(weekStart)}`
      const data = dataRef.current[space]
      if (
        !data ||
        data.meetingWeeks.includes(localDate(weekStart)) ||
        loadingWeeks.current.has(key)
      ) {
        return
      }
      loadingWeeks.current.add(key)
      try {
        const [start, end] = weekRange(weekStart)
        const rows = check(
          await supabase
            .from('meetings')
            .select(MEETING_FIELDS)
            .eq('workspace_id', data.workspaceId)
            .gte('starts_at', start.toISOString())
            .lt('starts_at', end.toISOString())
            .order('starts_at'),
        )
        update(space, (current) => ({
          ...current,
          meetings: sortMeetings([...current.meetings, ...(rows ?? []).map(toMeeting)]),
          meetingWeeks: [...current.meetingWeeks, localDate(start)],
        }))
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not load the calendar.', 4500)
      } finally {
        loadingWeeks.current.delete(key)
      }
    },

    addMeeting: (space: SpaceKey, input: NewMeetingInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const result = await supabase
          .from('meetings')
          .insert({
            workspace_id: data.workspaceId,
            title: input.title,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            location: input.location || null,
            meeting_url: input.meetingUrl || null,
            created_by: userId,
          })
          .select(MEETING_FIELDS)
          .single()
        if (
          result.error?.message.includes('meetings_workspace_id_external_provider_external_id_key')
        ) {
          throw new Error(
            'Only one meeting fits until the database fix is applied: run supabase/migrations/202611050001_fix_meeting_uniqueness.sql in the Supabase SQL editor.',
          )
        }
        const meeting = toMeeting(checkRow(result))
        update(space, (current) => ({
          ...current,
          meetings: sortMeetings([...current.meetings, meeting]),
        }))
      }, 'Added to calendar.'),

    updateMeeting: (space: SpaceKey, id: string, input: NewMeetingInput) =>
      run(async () => {
        const meeting = toMeeting(
          checkRow(
            await supabase
              .from('meetings')
              .update({
                title: input.title,
                starts_at: input.startsAt,
                ends_at: input.endsAt,
                meeting_url: input.meetingUrl || null,
              })
              .eq('id', id)
              .select(MEETING_FIELDS)
              .single(),
          ),
        )
        update(space, (current) => ({
          ...current,
          meetings: sortMeetings([...current.meetings.filter((item) => item.id !== id), meeting]),
        }))
      }, 'Calendar item updated.'),

    deleteMeeting: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('meetings').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          meetings: current.meetings.filter((item) => item.id !== id),
        }))
      }, 'Removed from calendar.'),

    saveNote: (space: SpaceKey, content: string) =>
      run(async () => {
        const { data, userId } = requireData(space)
        update(space, (current) => ({ ...current, note: content }))
        check(
          await supabase.from('daily_notes').upsert(
            {
              workspace_id: data.workspaceId,
              user_id: userId,
              note_date: localDate(),
              content,
            },
            { onConflict: 'workspace_id,user_id,note_date' },
          ),
        )
      }),

    /** Creates a note and returns it (null on failure). */
    addNote: async (
      space: SpaceKey,
      input: {
        title?: string
        content?: string
        meeting?: Meeting
        projectId?: string | null
      } = {},
    ) => {
      let created: Note | null = null
      await run(async () => {
        const { data, userId } = requireData(space)
        if (!data.notesReady) throw new Error(NOTES_HINT)
        const row = checkRow(
          await supabase
            .from('notes')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              title: input.title ?? '',
              content: input.content ?? '',
              meeting_id: input.meeting?.id ?? null,
              ...(data.notesCollab && input.projectId ? { project_id: input.projectId } : {}),
            })
            .select(noteFields(data.notesCollab))
            .single(),
        )
        const note = toNote(row)
        created = note
        update(space, (current) => ({ ...current, notes: sortNotes([note, ...current.notes]) }))
      })
      return created as Note | null
    },

    /**
     * The note linked to a meeting, created on first use with the meeting's title and
     * date. Returns null on failure.
     */
    meetingNote: async (space: SpaceKey, meeting: Meeting) => {
      const existing = dataRef.current[space]?.notes.find((note) => note.meetingId === meeting.id)
      if (existing) return existing
      let found: Note | null = null
      await run(async () => {
        const { data, userId } = requireData(space)
        if (!data.notesReady) throw new Error(NOTES_HINT)
        // Another tab may have created it already.
        const prior = check(
          await supabase
            .from('notes')
            .select(noteFields(data.notesCollab))
            .eq('user_id', userId)
            .eq('meeting_id', meeting.id)
            .maybeSingle(),
        ) as Row | null
        const when = new Date(meeting.startsAt).toLocaleDateString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        const row =
          prior ??
          checkRow(
            await supabase
              .from('notes')
              .insert({
                workspace_id: data.workspaceId,
                user_id: userId,
                meeting_id: meeting.id,
                title: `${meeting.title} · ${when}`,
                content:
                  '<h3>Agenda</h3><ul><li><br></li></ul><h3>Action items</h3><ul data-type="todo"><li data-checked="false"><br></li></ul>',
              })
              .select(noteFields(data.notesCollab))
              .single(),
          )
        const note = toNote(row)
        found = note
        update(space, (current) => ({
          ...current,
          notes: sortNotes([note, ...current.notes.filter((item) => item.id !== note.id)]),
        }))
      })
      return found as Note | null
    },

    /** Saves edits (autosave from the editor), quietly unless it fails. */
    updateNote: (space: SpaceKey, id: string, changes: NoteChanges) =>
      run(async () => {
        update(space, (current) => ({
          ...current,
          notes: sortNotes(
            current.notes.map((note) =>
              note.id === id ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note,
            ),
          ),
        }))
        check(await supabase.from('notes').update(noteColumns(changes)).eq('id', id))
      }),

    /** Applies a collaborator's live edit to the local copy (it is saved by them). */
    patchNoteLocal: (space: SpaceKey, id: string, changes: NoteChanges) =>
      update(space, (current) => ({
        ...current,
        notes: current.notes.map((note) => (note.id === id ? { ...note, ...changes } : note)),
      })),

    /** Shares a note with someone; they can read and edit it live. */
    shareNote: (space: SpaceKey, id: string, person: Person) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.notesCollab) throw new Error(NOTES_COLLAB_HINT)
        check(
          await supabase
            .from('note_members')
            .insert({ note_id: id, user_id: person.id, added_by: userId }),
        )
        update(space, (current) => ({
          ...current,
          people: { ...current.people, [person.id]: person.name },
          notes: current.notes.map((note) =>
            note.id === id && !note.members.includes(person.id)
              ? { ...note, members: [...note.members, person.id] }
              : note,
          ),
        }))
      }, `Shared with ${person.name}.`),

    /** Stops sharing with someone; removing yourself leaves the note. */
    unshareNote: (space: SpaceKey, id: string, memberId: string) =>
      run(async () => {
        const { userId } = requireData(space)
        check(
          await supabase.from('note_members').delete().eq('note_id', id).eq('user_id', memberId),
        )
        update(space, (current) => ({
          ...current,
          notes:
            memberId === userId
              ? current.notes.filter((note) => note.id !== id)
              : current.notes.map((note) =>
                  note.id === id
                    ? { ...note, members: note.members.filter((member) => member !== memberId) }
                    : note,
                ),
        }))
      }),

    deleteNote: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('notes').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          notes: current.notes.filter((note) => note.id !== id),
        }))
      }, 'Note deleted.'),

    addPlanItem: (space: SpaceKey, title: string) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const position = Math.max(0, ...data.plan.map((item) => item.position)) + 1000
        const row = checkRow(
          await supabase
            .from('plan_items')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              plan_date: localDate(),
              title,
              position,
            })
            .select(PLAN_FIELDS)
            .single(),
        )
        update(space, (current) => ({ ...current, plan: [...current.plan, toPlanItem(row)] }))
      }),

    togglePlanItem: (space: SpaceKey, id: string) =>
      run(async () => {
        const { data } = requireData(space)
        const item = data.plan.find((entry) => entry.id === id)
        if (!item) return
        const completedAt = item.completedAt ? null : new Date().toISOString()
        update(space, (current) => ({
          ...current,
          plan: current.plan.map((entry) => (entry.id === id ? { ...entry, completedAt } : entry)),
        }))
        check(await supabase.from('plan_items').update({ completed_at: completedAt }).eq('id', id))
      }),

    removePlanItem: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('plan_items').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          plan: current.plan.filter((entry) => entry.id !== id),
        }))
      }),

    addHabit: (space: SpaceKey, input: NewHabitInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.growthReady) throw new Error(GROWTH_HINT)
        const position = Math.max(0, ...data.habits.map((habit) => habit.position)) + 1000
        const row = checkRow(
          await supabase
            .from('habits')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              title: input.title,
              category: input.category,
              frequency: input.frequency,
              weekdays: input.weekdays ?? null,
              target_per_week: input.targetPerWeek ?? null,
              target_kind: input.targetKind ?? 'boolean',
              target_value: input.targetValue ?? null,
              target_unit: input.targetUnit ?? null,
              color: input.color ?? 'blue',
              position,
            })
            .select(HABIT_FIELDS)
            .single(),
        )
        update(space, (current) => ({ ...current, habits: [...current.habits, toHabit(row)] }))
      }, 'Habit added.'),

    updateHabit: (space: SpaceKey, id: string, changes: HabitChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.title !== undefined) columns.title = changes.title
        if (changes.category !== undefined) columns.category = changes.category
        if (changes.frequency !== undefined) columns.frequency = changes.frequency
        if (changes.weekdays !== undefined) columns.weekdays = changes.weekdays
        if (changes.targetPerWeek !== undefined) columns.target_per_week = changes.targetPerWeek
        if (changes.targetKind !== undefined) columns.target_kind = changes.targetKind
        if (changes.targetValue !== undefined) columns.target_value = changes.targetValue
        if (changes.targetUnit !== undefined) columns.target_unit = changes.targetUnit
        if (changes.color !== undefined) columns.color = changes.color
        const row = checkRow(
          await supabase.from('habits').update(columns).eq('id', id).select(HABIT_FIELDS).single(),
        )
        update(space, (current) => ({
          ...current,
          habits: current.habits.map((habit) => (habit.id === id ? toHabit(row) : habit)),
        }))
      }, 'Habit updated.'),

    archiveHabit: (space: SpaceKey, id: string) =>
      run(async () => {
        const archivedAt = new Date().toISOString()
        check(await supabase.from('habits').update({ archived_at: archivedAt }).eq('id', id))
        update(space, (current) => ({
          ...current,
          habits: current.habits.map((habit) => (habit.id === id ? { ...habit, archivedAt } : habit)),
        }))
      }, 'Habit archived.'),

    restoreHabit: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('habits').update({ archived_at: null }).eq('id', id))
        update(space, (current) => ({
          ...current,
          habits: current.habits.map((habit) => (habit.id === id ? { ...habit, archivedAt: null } : habit)),
        }))
      }, 'Habit restored.'),

    deleteHabit: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('habits').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          habits: current.habits.filter((habit) => habit.id !== id),
          habitEntries: current.habitEntries.filter((entry) => entry.habitId !== id),
        }))
      }, 'Habit deleted.'),

    /** Logs a day's state for a habit; logging the same state again clears it (undo). */
    logHabitEntry: (
      space: SpaceKey,
      habitId: string,
      date: string,
      status: HabitEntryStatus,
      options?: { note?: string; quantityValue?: number },
    ) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const existing = data.habitEntries.find(
          (entry) => entry.habitId === habitId && entry.date === date,
        )
        if (existing?.status === status) {
          check(await supabase.from('habit_entries').delete().eq('id', existing.id))
          update(space, (current) => ({
            ...current,
            habitEntries: current.habitEntries.filter((entry) => entry.id !== existing.id),
          }))
          return
        }
        const row = checkRow(
          await supabase
            .from('habit_entries')
            .upsert(
              {
                workspace_id: data.workspaceId,
                user_id: userId,
                habit_id: habitId,
                entry_date: date,
                status,
                logged_at: new Date().toISOString(),
                note: options?.note ?? null,
                quantity_value: options?.quantityValue ?? null,
              },
              { onConflict: 'habit_id,entry_date' },
            )
            .select(HABIT_ENTRY_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          habitEntries: [
            ...current.habitEntries.filter((entry) => entry.id !== existing?.id),
            toHabitEntry(row),
          ],
        }))
      }),

    clearHabitEntry: (space: SpaceKey, habitId: string, date: string) =>
      run(async () => {
        const { data } = requireData(space)
        const existing = data.habitEntries.find(
          (entry) => entry.habitId === habitId && entry.date === date,
        )
        if (!existing) return
        check(await supabase.from('habit_entries').delete().eq('id', existing.id))
        update(space, (current) => ({
          ...current,
          habitEntries: current.habitEntries.filter((entry) => entry.id !== existing.id),
        }))
      }),

    addBook: (space: SpaceKey, input: NewBookInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const position = Math.max(0, ...data.books.map((book) => book.position)) + 1000
        const result = await supabase
          .from('books')
          .insert({
            workspace_id: data.workspaceId,
            user_id: userId,
            title: input.title,
            author: input.author ?? '',
            status: input.status ?? 'planned',
            total_pages: input.totalPages ?? null,
            cover_url: input.coverUrl ?? null,
            category: input.category ?? null,
            pages_per_day_goal: input.pagesPerDayGoal ?? null,
            position,
          })
          .select(BOOK_FIELDS)
          .single()
        if (missingColumn(result.error)) throw new Error(READING_ENRICHMENT_HINT)
        const row = checkRow(result)
        update(space, (current) => ({ ...current, books: [...current.books, toBook(row)] }))
      }, 'Book added.'),

    updateBook: (space: SpaceKey, id: string, changes: BookChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.title !== undefined) columns.title = changes.title
        if (changes.author !== undefined) columns.author = changes.author
        if (changes.status !== undefined) columns.status = changes.status
        if (changes.totalPages !== undefined) columns.total_pages = changes.totalPages
        if (changes.startedAt !== undefined) columns.started_at = changes.startedAt
        if (changes.completedAt !== undefined) columns.completed_at = changes.completedAt
        if (changes.coverUrl !== undefined) columns.cover_url = changes.coverUrl
        if (changes.category !== undefined) columns.category = changes.category
        if (changes.pagesPerDayGoal !== undefined) columns.pages_per_day_goal = changes.pagesPerDayGoal
        if (changes.rating !== undefined) columns.rating = changes.rating
        if (changes.learned !== undefined) columns.learned = changes.learned
        if (changes.interesting !== undefined) columns.interesting = changes.interesting
        if (changes.apply !== undefined) columns.apply = changes.apply
        if (changes.action !== undefined) columns.action = changes.action
        const result = await supabase.from('books').update(columns).eq('id', id).select(BOOK_FIELDS).single()
        if (missingColumn(result.error)) throw new Error(READING_ENRICHMENT_HINT)
        const row = checkRow(result)
        update(space, (current) => ({
          ...current,
          books: current.books.map((book) => (book.id === id ? toBook(row) : book)),
        }))
      }, 'Book updated.'),

    deleteBook: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('books').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          books: current.books.filter((book) => book.id !== id),
          readingSessions: current.readingSessions.filter((session) => session.bookId !== id),
        }))
      }, 'Book removed.'),

    addReadingSession: (space: SpaceKey, input: NewReadingSessionInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const result = await supabase
          .from('reading_sessions')
          .insert({
            workspace_id: data.workspaceId,
            user_id: userId,
            book_id: input.bookId,
            session_date: input.date,
            pages_read: input.pagesRead ?? null,
            duration_minutes: input.durationMinutes ?? null,
            takeaway: input.takeaway ?? null,
            chapter: input.chapter ?? null,
          })
          .select(READING_SESSION_FIELDS)
          .single()
        if (missingColumn(result.error)) throw new Error(READING_ENRICHMENT_HINT)
        const row = checkRow(result)
        update(space, (current) => ({
          ...current,
          readingSessions: [toReadingSession(row), ...current.readingSessions],
        }))
      }, 'Reading session logged.'),

    deleteReadingSession: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('reading_sessions').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          readingSessions: current.readingSessions.filter((session) => session.id !== id),
        }))
      }, 'Reading session removed.'),

    addFocusSession: (space: SpaceKey, input: NewFocusSessionInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const row = checkRow(
          await supabase
            .from('focus_sessions')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              session_date: input.date,
              duration_minutes: input.durationMinutes,
              distraction_count: input.distractionCount ?? 0,
              tasks_completed: input.tasksCompleted ?? 0,
              concentration_rating: input.concentrationRating,
              note: input.note ?? null,
            })
            .select(FOCUS_SESSION_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          focusSessions: [toFocusSession(row), ...current.focusSessions],
        }))
      }, 'Focus session logged.'),

    updateFocusSession: (space: SpaceKey, id: string, changes: FocusSessionChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.durationMinutes !== undefined) columns.duration_minutes = changes.durationMinutes
        if (changes.distractionCount !== undefined) columns.distraction_count = changes.distractionCount
        if (changes.tasksCompleted !== undefined) columns.tasks_completed = changes.tasksCompleted
        if (changes.concentrationRating !== undefined)
          columns.concentration_rating = changes.concentrationRating
        if (changes.note !== undefined) columns.note = changes.note
        const row = checkRow(
          await supabase
            .from('focus_sessions')
            .update(columns)
            .eq('id', id)
            .select(FOCUS_SESSION_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          focusSessions: current.focusSessions.map((session) =>
            session.id === id ? toFocusSession(row) : session,
          ),
        }))
      }, 'Focus session updated.'),

    deleteFocusSession: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('focus_sessions').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          focusSessions: current.focusSessions.filter((session) => session.id !== id),
        }))
      }, 'Focus session removed.'),

    addLearningTopic: (space: SpaceKey, input: NewLearningTopicInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.learningGoalsReady) throw new Error(LEARNING_GOALS_HINT)
        const position = Math.max(0, ...data.learningTopics.map((topic) => topic.position)) + 1000
        const row = checkRow(
          await supabase
            .from('learning_topics')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              title: input.title,
              category: input.category,
              status: input.status ?? 'not_started',
              resources: input.resources ?? null,
              notes: input.notes ?? null,
              position,
            })
            .select(LEARNING_TOPIC_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          learningTopics: [...current.learningTopics, toLearningTopic(row)],
        }))
      }, 'Topic added.'),

    updateLearningTopic: (space: SpaceKey, id: string, changes: LearningTopicChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.title !== undefined) columns.title = changes.title
        if (changes.category !== undefined) columns.category = changes.category
        if (changes.status !== undefined) columns.status = changes.status
        if (changes.resources !== undefined) columns.resources = changes.resources
        if (changes.notes !== undefined) columns.notes = changes.notes
        const row = checkRow(
          await supabase
            .from('learning_topics')
            .update(columns)
            .eq('id', id)
            .select(LEARNING_TOPIC_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          learningTopics: current.learningTopics.map((topic) =>
            topic.id === id ? toLearningTopic(row) : topic,
          ),
        }))
      }, 'Topic updated.'),

    archiveLearningTopic: (space: SpaceKey, id: string) =>
      run(async () => {
        const archivedAt = new Date().toISOString()
        check(await supabase.from('learning_topics').update({ archived_at: archivedAt }).eq('id', id))
        update(space, (current) => ({
          ...current,
          learningTopics: current.learningTopics.map((topic) =>
            topic.id === id ? { ...topic, archivedAt } : topic,
          ),
        }))
      }, 'Topic archived.'),

    restoreLearningTopic: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('learning_topics').update({ archived_at: null }).eq('id', id))
        update(space, (current) => ({
          ...current,
          learningTopics: current.learningTopics.map((topic) =>
            topic.id === id ? { ...topic, archivedAt: null } : topic,
          ),
        }))
      }, 'Topic restored.'),

    deleteLearningTopic: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('learning_topics').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          learningTopics: current.learningTopics.filter((topic) => topic.id !== id),
        }))
      }, 'Topic deleted.'),

    addGoal: (space: SpaceKey, input: NewGoalInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.learningGoalsReady) throw new Error(LEARNING_GOALS_HINT)
        const position = Math.max(0, ...data.goals.map((goal) => goal.position)) + 1000
        const row = checkRow(
          await supabase
            .from('goals')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              title: input.title,
              category: input.category,
              target_date: input.targetDate ?? null,
              notes: input.notes ?? null,
              position,
            })
            .select(GOAL_FIELDS)
            .single(),
        )
        update(space, (current) => ({ ...current, goals: [...current.goals, toGoal(row)] }))
      }, 'Goal added.'),

    updateGoal: (space: SpaceKey, id: string, changes: GoalChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.title !== undefined) columns.title = changes.title
        if (changes.category !== undefined) columns.category = changes.category
        if (changes.targetDate !== undefined) columns.target_date = changes.targetDate
        if (changes.notes !== undefined) columns.notes = changes.notes
        if (changes.status !== undefined) {
          columns.status = changes.status
          columns.completed_at = changes.status === 'completed' ? new Date().toISOString() : null
        }
        const row = checkRow(
          await supabase.from('goals').update(columns).eq('id', id).select(GOAL_FIELDS).single(),
        )
        update(space, (current) => ({
          ...current,
          goals: current.goals.map((goal) => (goal.id === id ? toGoal(row) : goal)),
        }))
      }, 'Goal updated.'),

    deleteGoal: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('goals').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          goals: current.goals.filter((goal) => goal.id !== id),
          goalMilestones: current.goalMilestones.filter((milestone) => milestone.goalId !== id),
        }))
      }, 'Goal deleted.'),

    addMilestone: (space: SpaceKey, input: NewMilestoneInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const position =
          Math.max(
            0,
            ...data.goalMilestones
              .filter((milestone) => milestone.goalId === input.goalId)
              .map((milestone) => milestone.position),
          ) + 1000
        const row = checkRow(
          await supabase
            .from('goal_milestones')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              goal_id: input.goalId,
              title: input.title,
              target_date: input.targetDate ?? null,
              position,
            })
            .select(GOAL_MILESTONE_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          goalMilestones: [...current.goalMilestones, toGoalMilestone(row)],
        }))
      }, 'Milestone added.'),

    toggleMilestone: (space: SpaceKey, id: string) =>
      run(async () => {
        const { data } = requireData(space)
        const milestone = data.goalMilestones.find((item) => item.id === id)
        if (!milestone) return
        const completedAt = milestone.completedAt ? null : new Date().toISOString()
        update(space, (current) => ({
          ...current,
          goalMilestones: current.goalMilestones.map((item) =>
            item.id === id ? { ...item, completedAt } : item,
          ),
        }))
        check(await supabase.from('goal_milestones').update({ completed_at: completedAt }).eq('id', id))
      }),

    deleteMilestone: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('goal_milestones').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          goalMilestones: current.goalMilestones.filter((item) => item.id !== id),
        }))
      }),

    addExpense: (space: SpaceKey, input: NewExpenseInput) =>
      run(
        async () => {
          const { data, userId } = requireData(space)
          const office = space === 'office'
          const result = await supabase
            .from('expense_entries')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              kind: office ? 'reimbursement' : (input.kind ?? 'expense'),
              description: input.description,
              category: input.category,
              amount: input.amount,
              currency: settings[space]?.currency ?? DEFAULT_CURRENCY,
              expense_date: input.date ?? localDate(),
              status: office ? 'pending' : 'recorded',
              payment_method: input.paymentMethod ?? null,
              notes: input.notes ?? null,
            })
            .select(EXPENSE_FIELDS)
            .single()
          if (result.error?.message.includes('expense_entries_kind_check')) {
            throw new Error(`Income needs a database update. ${MIGRATION_HINT}`)
          }
          const record = toExpense(checkRow(result))
          update(space, (current) => ({
            ...current,
            expenses: [record, ...current.expenses].sort((a, b) => b.date.localeCompare(a.date)),
          }))
        },
        space === 'office'
          ? 'Reimbursement submitted.'
          : input.kind === 'income'
            ? 'Income saved.'
            : 'Expense saved.',
      ),

    updateExpense: (space: SpaceKey, id: string, changes: ExpenseChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.description !== undefined) columns.description = changes.description
        if (changes.category !== undefined) columns.category = changes.category
        if (changes.amount !== undefined) columns.amount = changes.amount
        if (changes.date !== undefined) columns.expense_date = changes.date
        if (changes.kind !== undefined) columns.kind = changes.kind
        if (changes.paymentMethod !== undefined) columns.payment_method = changes.paymentMethod
        if (changes.notes !== undefined) columns.notes = changes.notes
        const row = checkRow(
          await supabase.from('expense_entries').update(columns).eq('id', id).select(EXPENSE_FIELDS).single(),
        )
        const record = toExpense(row)
        update(space, (current) => ({
          ...current,
          expenses: current.expenses
            .map((item) => (item.id === id ? record : item))
            .sort((a, b) => b.date.localeCompare(a.date)),
        }))
      }, 'Entry updated.'),

    deleteExpense: (space: SpaceKey, id: string) =>
      run(async () => {
        const result = check(
          await supabase.from('expense_entries').delete().eq('id', id).select('id'),
        )
        if (!result?.length) throw new Error('Approved or paid entries cannot be deleted.')
        update(space, (current) => ({
          ...current,
          expenses: current.expenses.filter((item) => item.id !== id),
        }))
      }, 'Entry deleted.'),

    saveBudget: (space: SpaceKey, changes: BudgetChanges) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.financeReady) throw new Error(FINANCE_HINT)
        const columns: Row = {
          workspace_id: data.workspaceId,
          user_id: userId,
        }
        if (changes.monthlyLimit !== undefined) columns.monthly_limit = changes.monthlyLimit
        if (changes.categoryLimits !== undefined) columns.category_limits = changes.categoryLimits
        const row = checkRow(
          await supabase
            .from('budgets')
            .upsert(columns, { onConflict: 'workspace_id,user_id' })
            .select(BUDGET_FIELDS)
            .single(),
        )
        update(space, (current) => ({ ...current, budget: toBudget(row) }))
      }, 'Budget saved.'),

    addSavingsGoal: (space: SpaceKey, input: NewSavingsGoalInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.financeReady) throw new Error(FINANCE_HINT)
        const position = Math.max(0, ...data.savingsGoals.map((goal) => goal.position)) + 1000
        const row = checkRow(
          await supabase
            .from('savings_goals')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              name: input.name,
              target_amount: input.targetAmount,
              target_date: input.targetDate ?? null,
              position,
            })
            .select(SAVINGS_GOAL_FIELDS)
            .single(),
        )
        update(space, (current) => ({ ...current, savingsGoals: [...current.savingsGoals, toSavingsGoal(row)] }))
      }, 'Savings goal added.'),

    updateSavingsGoal: (space: SpaceKey, id: string, changes: SavingsGoalChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.name !== undefined) columns.name = changes.name
        if (changes.targetAmount !== undefined) columns.target_amount = changes.targetAmount
        if (changes.targetDate !== undefined) columns.target_date = changes.targetDate
        const row = checkRow(
          await supabase.from('savings_goals').update(columns).eq('id', id).select(SAVINGS_GOAL_FIELDS).single(),
        )
        update(space, (current) => ({
          ...current,
          savingsGoals: current.savingsGoals.map((goal) => (goal.id === id ? toSavingsGoal(row) : goal)),
        }))
      }, 'Savings goal updated.'),

    archiveSavingsGoal: (space: SpaceKey, id: string) =>
      run(async () => {
        const archivedAt = new Date().toISOString()
        check(await supabase.from('savings_goals').update({ archived_at: archivedAt }).eq('id', id))
        update(space, (current) => ({
          ...current,
          savingsGoals: current.savingsGoals.map((goal) =>
            goal.id === id ? { ...goal, archivedAt } : goal,
          ),
        }))
      }, 'Savings goal archived.'),

    deleteSavingsGoal: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('savings_goals').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          savingsGoals: current.savingsGoals.filter((goal) => goal.id !== id),
          savingsContributions: current.savingsContributions.filter((item) => item.goalId !== id),
        }))
      }, 'Savings goal deleted.'),

    addSavingsContribution: (space: SpaceKey, input: NewContributionInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.financeReady) throw new Error(FINANCE_HINT)
        const row = checkRow(
          await supabase
            .from('savings_contributions')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              goal_id: input.goalId,
              amount: input.amount,
              direction: input.direction,
              occurred_on: input.occurredOn ?? localDate(),
              note: input.note ?? null,
            })
            .select(SAVINGS_CONTRIBUTION_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          savingsContributions: [toSavingsContribution(row), ...current.savingsContributions],
        }))
      }, input.direction === 'withdrawal' ? 'Withdrawal recorded.' : 'Contribution added.'),

    deleteSavingsContribution: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('savings_contributions').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          savingsContributions: current.savingsContributions.filter((item) => item.id !== id),
        }))
      }, 'Entry deleted.'),

    addRecurringPayment: (space: SpaceKey, input: NewRecurringPaymentInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        if (!data.financeReady) throw new Error(FINANCE_HINT)
        const row = checkRow(
          await supabase
            .from('recurring_payments')
            .insert({
              workspace_id: data.workspaceId,
              user_id: userId,
              name: input.name,
              kind: input.kind,
              category: input.category ?? null,
              amount: input.amount,
              frequency: input.frequency,
              next_due_date: input.nextDueDate,
            })
            .select(RECURRING_PAYMENT_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          recurringPayments: [...current.recurringPayments, toRecurringPayment(row)].sort((a, b) =>
            a.nextDueDate.localeCompare(b.nextDueDate),
          ),
        }))
      }, 'Recurring payment added.'),

    updateRecurringPayment: (space: SpaceKey, id: string, changes: RecurringPaymentChanges) =>
      run(async () => {
        const columns: Row = {}
        if (changes.name !== undefined) columns.name = changes.name
        if (changes.kind !== undefined) columns.kind = changes.kind
        if (changes.category !== undefined) columns.category = changes.category
        if (changes.amount !== undefined) columns.amount = changes.amount
        if (changes.frequency !== undefined) columns.frequency = changes.frequency
        if (changes.nextDueDate !== undefined) columns.next_due_date = changes.nextDueDate
        if (changes.active !== undefined) columns.active = changes.active
        const row = checkRow(
          await supabase
            .from('recurring_payments')
            .update(columns)
            .eq('id', id)
            .select(RECURRING_PAYMENT_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          recurringPayments: current.recurringPayments
            .map((item) => (item.id === id ? toRecurringPayment(row) : item))
            .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
        }))
      }, 'Recurring payment updated.'),

    deleteRecurringPayment: (space: SpaceKey, id: string) =>
      run(async () => {
        check(await supabase.from('recurring_payments').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          recurringPayments: current.recurringPayments.filter((item) => item.id !== id),
        }))
      }, 'Recurring payment deleted.'),

    /** Confirms a recurring payment was paid: logs a real transaction and advances the due date. */
    markRecurringPaymentPaid: (space: SpaceKey, id: string) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const item = data.recurringPayments.find((entry) => entry.id === id)
        if (!item) return
        const nextDueDate = advanceDueDate(item.nextDueDate, item.frequency)
        const expenseResult = await supabase
          .from('expense_entries')
          .insert({
            workspace_id: data.workspaceId,
            user_id: userId,
            kind: item.kind,
            description: item.name,
            category: item.category ?? 'Other',
            amount: item.amount,
            currency: settings[space]?.currency ?? DEFAULT_CURRENCY,
            expense_date: localDate(),
            status: 'recorded',
          })
          .select(EXPENSE_FIELDS)
          .single()
        const record = toExpense(checkRow(expenseResult))
        const row = checkRow(
          await supabase
            .from('recurring_payments')
            .update({ next_due_date: nextDueDate })
            .eq('id', id)
            .select(RECURRING_PAYMENT_FIELDS)
            .single(),
        )
        update(space, (current) => ({
          ...current,
          expenses: [record, ...current.expenses].sort((a, b) => b.date.localeCompare(a.date)),
          recurringPayments: current.recurringPayments
            .map((entry) => (entry.id === id ? toRecurringPayment(row) : entry))
            .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
        }))
      }, 'Marked as paid.'),

    renameWorkspace: (space: SpaceKey, name: string) =>
      run(async () => {
        const { data } = requireData(space)
        check(await supabase.from('workspaces').update({ name }).eq('id', data.workspaceId))
        update(space, (current) => ({ ...current, name }))
      }),

    updateProfileName: (fullName: string) =>
      run(async () => {
        if (!profile) throw new Error('Not signed in.')
        check(await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id))
        await supabase.auth.updateUser({ data: { full_name: fullName } })
        setProfile({ ...profile, fullName })
      }),

    saveSettings: (space: SpaceKey, next: WorkspaceSettings) =>
      run(async () => {
        // Merge, so saving one setting (currency) keeps the others (meeting colors).
        const merged = { ...settings, [space]: { ...settings[space], ...next } }
        setSettings(merged)
        const { error } = await supabase.auth.updateUser({ data: { settings: merged } })
        if (error) throw new Error(error.message)
      }),

    markNotificationsRead: (space: SpaceKey) =>
      run(async () => {
        const { data } = requireData(space)
        const unread = data.notifications.filter((item) => !item.readAt).map((item) => item.id)
        if (!unread.length) return
        const readAt = new Date().toISOString()
        check(await supabase.from('notifications').update({ read_at: readAt }).in('id', unread))
        update(space, (current) => ({
          ...current,
          notifications: current.notifications.map((item) => ({
            ...item,
            readAt: item.readAt ?? readAt,
          })),
        }))
      }),

    stopTimer: () =>
      run(async () => {
        if (timer) await finishTimer(timer)
      }, 'Timer stopped.'),

    /** Freezes the running timer; the time so far is saved on its entry. */
    pauseTimer: () =>
      run(async () => {
        if (!timer || timer.state !== 'running') return
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000)
        const paused: TimeEntry = {
          ...timer,
          state: 'paused',
          accumulatedSeconds: timer.accumulatedSeconds + Math.max(0, elapsed),
        }
        check(
          await supabase
            .from('time_entries')
            .update({
              state: 'paused',
              paused_at: now.toISOString(),
              accumulated_seconds: paused.accumulatedSeconds,
            })
            .eq('id', timer.id),
        )
        setTimer(paused)
        replaceEntry(timer.id, [paused])
      }, 'Timer paused.'),

    /**
     * Continues a paused timer as a new run on the same task. Each run is its own entry, so
     * time lands on the day it was actually worked.
     */
    resumeTimer: () =>
      run(async () => {
        if (!timer || timer.state !== 'paused' || !timer.taskId) return
        const paused = timer
        if (!profile) throw new Error('Not signed in.')
        await finishTimer(paused)
        const entry = toTimer(
          checkRow(
            await supabase
              .from('time_entries')
              .insert({
                workspace_id: paused.workspaceId,
                task_id: paused.taskId,
                user_id: profile.id,
                state: 'running',
                started_at: new Date().toISOString(),
              })
              .select(TIMER_FIELDS)
              .single(),
          ),
        )
        setTimer(entry)
        // Show the new run next to the one it continues.
        setSpaceData((current) => {
          const next = { ...current }
          for (const key of Object.keys(next) as SpaceKey[]) {
            const data = next[key]!
            if (data.timeEntries.some((item) => item.id === paused.id)) {
              next[key] = { ...data, timeEntries: [entry, ...data.timeEntries] }
            }
          }
          return next
        })
      }, 'Timer resumed.'),

    startTimer: (space: SpaceKey, taskId: string) =>
      run(async () => {
        const { task } = findTask(space, taskId)
        const { userId } = requireData(space)
        // Only one active timer per user is allowed by the database.
        if (timer) await finishTimer(timer)
        const entry = toTimer(
          checkRow(
            await supabase
              .from('time_entries')
              .insert({
                workspace_id: task.workspaceId,
                task_id: taskId,
                user_id: userId,
                state: 'running',
                started_at: new Date().toISOString(),
              })
              .select(TIMER_FIELDS)
              .single(),
          ),
        )
        setTimer(entry)
        update(space, (current) => ({ ...current, timeEntries: [entry, ...current.timeEntries] }))
      }, 'Timer started.'),

    /** Records time spent without running the timer. */
    logTime: (space: SpaceKey, input: NewTimeLogInput) =>
      run(async () => {
        const { data, userId } = requireData(space)
        const task = input.taskId ? findTask(space, input.taskId).task : null
        const started = new Date(`${input.date}T09:00`)
        const ended = new Date(started.getTime() + input.minutes * 60_000)
        const entry = toTimer(
          checkRow(
            await supabase
              .from('time_entries')
              .insert({
                workspace_id: task?.workspaceId ?? data.workspaceId,
                task_id: task?.id ?? null,
                user_id: userId,
                state: 'stopped',
                started_at: started.toISOString(),
                ended_at: ended.toISOString(),
                accumulated_seconds: input.minutes * 60,
                description: input.description || null,
              })
              .select(TIMER_FIELDS)
              .single(),
          ),
        )
        update(space, (current) => ({
          ...current,
          timeEntries: [entry, ...current.timeEntries].sort((a, b) =>
            b.startedAt.localeCompare(a.startedAt),
          ),
        }))
      }, 'Time logged.'),

    deleteTimeEntry: (space: SpaceKey, id: string) =>
      run(async () => {
        if (timer?.id === id) throw new Error('Stop the timer before deleting it.')
        check(await supabase.from('time_entries').delete().eq('id', id))
        update(space, (current) => ({
          ...current,
          timeEntries: current.timeEntries.filter((item) => item.id !== id),
        }))
      }, 'Time entry deleted.'),

    signOut: async () => {
      await supabase.auth.signOut()
      router.replace('/login')
      router.refresh()
    },
  }

  return { profile, spaceData, loadError, timer, settings, toast, ...actions }
}

/** Supabase-backed state for every workspace, kept alive across route changes. */
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const state = useWorkbenchState()
  return <WorkbenchContext.Provider value={state}>{children}</WorkbenchContext.Provider>
}

function useWorkbench() {
  const context = useContext(WorkbenchContext)
  if (!context) throw new Error('useWorkbench must be used inside <WorkbenchProvider>')
  return context
}

export function useToast() {
  const { toast, showToast } = useWorkbench()
  return { toast, showToast }
}

/** Data and actions for the workspace named by the current `[space]` route param. */
export function useWorkspace() {
  const { space } = useParams<{ space: string }>()
  const config = findWorkspace(space)
  if (!config) throw new Error(`Unknown workspace "${space}"`)
  const store = useWorkbench()
  const key = config.key
  const data = store.spaceData[key]
  const currency: Currency = store.settings[key]?.currency ?? DEFAULT_CURRENCY

  return {
    workspace: data ? { ...config, name: data.name } : config,
    profile: store.profile,
    ready: Boolean(data),
    error: store.loadError,
    projects: data?.projects ?? [],
    tasks: data?.tasks ?? [],
    meetings: data?.meetings ?? [],
    meetingWeeks: data?.meetingWeeks ?? [],
    note: data?.note ?? '',
    plan: data?.plan ?? [],
    expenses: data?.expenses ?? [],
    notifications: data?.notifications ?? [],
    timeEntries: data?.timeEntries ?? [],
    collaboration: data?.collaboration ?? false,
    /** Display name for a user id; you are "You". */
    personName: (id: string) =>
      id === store.profile?.id ? 'You' : (data?.people[id] ?? 'Someone'),
    /** True for projects and tasks in your own workspace (you can share and delete them). */
    isOwn: (workspaceId: string) => workspaceId === data?.workspaceId,
    timer: store.timer,
    settings: { currency, meetingCategories: store.settings[key]?.meetingCategories },
    reload: () => store.reload(key),
    addProject: (name: string, sharedDomain: string | null = null) =>
      store.addProject(key, name, sharedDomain),
    setProjectDomain: (id: string, sharedDomain: string | null) =>
      store.setProjectDomain(key, id, sharedDomain),
    setProjectColor: (id: string, color: string) => store.setProjectColor(key, id, color),
    loadWeek: (weekStart: Date) => store.loadWeek(key, weekStart),
    addTask: (input: NewTaskInput) => store.addTask(key, input),
    toggleTask: (id: string) => store.toggleTask(key, id),
    updateTask: (id: string, changes: TaskChanges) => store.updateTask(key, id, changes),
    deleteTask: (id: string) => store.deleteTask(key, id),
    tagTask: (id: string, person: Person) => store.tagTask(key, id, person),
    untagTask: (id: string, userId: string) => store.untagTask(key, id, userId),
    tagProject: (id: string, person: Person) => store.tagProject(key, id, person),
    untagProject: (id: string, userId: string) => store.untagProject(key, id, userId),
    searchPeople: store.searchPeople,
    addMeeting: (input: NewMeetingInput) => store.addMeeting(key, input),
    updateMeeting: (id: string, input: NewMeetingInput) => store.updateMeeting(key, id, input),
    deleteMeeting: (id: string) => store.deleteMeeting(key, id),
    saveNote: (content: string) => store.saveNote(key, content),
    notes: data?.notes ?? [],
    notesReady: data?.notesReady ?? true,
    notesCollab: data?.notesCollab ?? false,
    addNote: (input?: {
      title?: string
      content?: string
      meeting?: Meeting
      projectId?: string | null
    }) => store.addNote(key, input),
    patchNoteLocal: (id: string, changes: NoteChanges) => store.patchNoteLocal(key, id, changes),
    shareNote: (id: string, person: Person) => store.shareNote(key, id, person),
    unshareNote: (id: string, userId: string) => store.unshareNote(key, id, userId),
    meetingNote: (meeting: Meeting) => store.meetingNote(key, meeting),
    updateNote: (id: string, changes: NoteChanges) => store.updateNote(key, id, changes),
    deleteNote: (id: string) => store.deleteNote(key, id),
    addPlanItem: (title: string) => store.addPlanItem(key, title),
    togglePlanItem: (id: string) => store.togglePlanItem(key, id),
    removePlanItem: (id: string) => store.removePlanItem(key, id),
    habits: data?.habits ?? [],
    habitEntries: data?.habitEntries ?? [],
    books: data?.books ?? [],
    readingSessions: data?.readingSessions ?? [],
    focusSessions: data?.focusSessions ?? [],
    growthReady: data?.growthReady ?? true,
    addHabit: (input: NewHabitInput) => store.addHabit(key, input),
    updateHabit: (id: string, changes: HabitChanges) => store.updateHabit(key, id, changes),
    archiveHabit: (id: string) => store.archiveHabit(key, id),
    restoreHabit: (id: string) => store.restoreHabit(key, id),
    deleteHabit: (id: string) => store.deleteHabit(key, id),
    logHabitEntry: (
      habitId: string,
      date: string,
      status: HabitEntryStatus,
      options?: { note?: string; quantityValue?: number },
    ) => store.logHabitEntry(key, habitId, date, status, options),
    clearHabitEntry: (habitId: string, date: string) => store.clearHabitEntry(key, habitId, date),
    addBook: (input: NewBookInput) => store.addBook(key, input),
    updateBook: (id: string, changes: BookChanges) => store.updateBook(key, id, changes),
    deleteBook: (id: string) => store.deleteBook(key, id),
    addReadingSession: (input: NewReadingSessionInput) => store.addReadingSession(key, input),
    deleteReadingSession: (id: string) => store.deleteReadingSession(key, id),
    addFocusSession: (input: NewFocusSessionInput) => store.addFocusSession(key, input),
    updateFocusSession: (id: string, changes: FocusSessionChanges) =>
      store.updateFocusSession(key, id, changes),
    deleteFocusSession: (id: string) => store.deleteFocusSession(key, id),
    dailyNoteHistory: data?.dailyNoteHistory ?? [],
    learningTopics: data?.learningTopics ?? [],
    goals: data?.goals ?? [],
    goalMilestones: data?.goalMilestones ?? [],
    learningGoalsReady: data?.learningGoalsReady ?? true,
    addLearningTopic: (input: NewLearningTopicInput) => store.addLearningTopic(key, input),
    updateLearningTopic: (id: string, changes: LearningTopicChanges) =>
      store.updateLearningTopic(key, id, changes),
    archiveLearningTopic: (id: string) => store.archiveLearningTopic(key, id),
    restoreLearningTopic: (id: string) => store.restoreLearningTopic(key, id),
    deleteLearningTopic: (id: string) => store.deleteLearningTopic(key, id),
    addGoal: (input: NewGoalInput) => store.addGoal(key, input),
    updateGoal: (id: string, changes: GoalChanges) => store.updateGoal(key, id, changes),
    deleteGoal: (id: string) => store.deleteGoal(key, id),
    addMilestone: (input: NewMilestoneInput) => store.addMilestone(key, input),
    toggleMilestone: (id: string) => store.toggleMilestone(key, id),
    deleteMilestone: (id: string) => store.deleteMilestone(key, id),
    addExpense: (input: NewExpenseInput) => store.addExpense(key, input),
    updateExpense: (id: string, changes: ExpenseChanges) => store.updateExpense(key, id, changes),
    deleteExpense: (id: string) => store.deleteExpense(key, id),
    budget: data?.budget ?? null,
    savingsGoals: data?.savingsGoals ?? [],
    savingsContributions: data?.savingsContributions ?? [],
    recurringPayments: data?.recurringPayments ?? [],
    financeReady: data?.financeReady ?? true,
    saveBudget: (changes: BudgetChanges) => store.saveBudget(key, changes),
    addSavingsGoal: (input: NewSavingsGoalInput) => store.addSavingsGoal(key, input),
    updateSavingsGoal: (id: string, changes: SavingsGoalChanges) =>
      store.updateSavingsGoal(key, id, changes),
    archiveSavingsGoal: (id: string) => store.archiveSavingsGoal(key, id),
    deleteSavingsGoal: (id: string) => store.deleteSavingsGoal(key, id),
    addSavingsContribution: (input: NewContributionInput) => store.addSavingsContribution(key, input),
    deleteSavingsContribution: (id: string) => store.deleteSavingsContribution(key, id),
    addRecurringPayment: (input: NewRecurringPaymentInput) => store.addRecurringPayment(key, input),
    updateRecurringPayment: (id: string, changes: RecurringPaymentChanges) =>
      store.updateRecurringPayment(key, id, changes),
    deleteRecurringPayment: (id: string) => store.deleteRecurringPayment(key, id),
    markRecurringPaymentPaid: (id: string) => store.markRecurringPaymentPaid(key, id),
    renameWorkspace: (name: string) => store.renameWorkspace(key, name),
    updateProfileName: store.updateProfileName,
    saveSettings: (next: WorkspaceSettings) => store.saveSettings(key, next),
    markNotificationsRead: () => store.markNotificationsRead(key),
    startTimer: (taskId: string) => store.startTimer(key, taskId),
    logTime: (input: NewTimeLogInput) => store.logTime(key, input),
    deleteTimeEntry: (id: string) => store.deleteTimeEntry(key, id),
    stopTimer: store.stopTimer,
    pauseTimer: store.pauseTimer,
    resumeTimer: store.resumeTimer,
    signOut: store.signOut,
  }
}
