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
import { projectSlug } from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import type {
  AppNotification,
  Currency,
  ExpenseRecord,
  Meeting,
  NewExpenseInput,
  NewMeetingInput,
  NewTaskInput,
  NewTimeLogInput,
  Person,
  PlanItem,
  Profile,
  Project,
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
const EXPENSE_FIELDS = 'id,kind,expense_date,description,category,amount,currency,status'
const TIMER_FIELDS =
  'id,workspace_id,task_id,user_id,state,started_at,ended_at,accumulated_seconds,description,task:tasks(title)'
/** How far back time entries are loaded for charts and per-task totals. */
const TIME_HISTORY_DAYS = 180
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
    supabase.from('workspaces').select('id,name,task_prefix').eq('slug', slug).maybeSingle()
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
  ])

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
    expenses: (check(expenses) ?? []).map(toExpense),
    notifications: (check(notifications) ?? []).map(toNotification),
    timeEntries,
    people,
    collaboration,
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
    setSpaceData((current) => {
      const next = { ...current }
      for (const key of Object.keys(next) as SpaceKey[]) {
        const data = next[key]!
        if (data.timeEntries.some((item) => item.id === entry.id)) {
          next[key] = {
            ...data,
            timeEntries: data.timeEntries.map((item) => (item.id === entry.id ? stopped : item)),
          }
        }
      }
      return next
    })
  }

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
        const merged = { ...settings, [space]: next }
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
    settings: { currency },
    reload: () => store.reload(key),
    addProject: (name: string, sharedDomain: string | null = null) =>
      store.addProject(key, name, sharedDomain),
    setProjectDomain: (id: string, sharedDomain: string | null) =>
      store.setProjectDomain(key, id, sharedDomain),
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
    addPlanItem: (title: string) => store.addPlanItem(key, title),
    togglePlanItem: (id: string) => store.togglePlanItem(key, id),
    removePlanItem: (id: string) => store.removePlanItem(key, id),
    addExpense: (input: NewExpenseInput) => store.addExpense(key, input),
    deleteExpense: (id: string) => store.deleteExpense(key, id),
    renameWorkspace: (name: string) => store.renameWorkspace(key, name),
    updateProfileName: store.updateProfileName,
    saveSettings: (next: WorkspaceSettings) => store.saveSettings(key, next),
    markNotificationsRead: () => store.markNotificationsRead(key),
    startTimer: (taskId: string) => store.startTimer(key, taskId),
    logTime: (input: NewTimeLogInput) => store.logTime(key, input),
    deleteTimeEntry: (id: string) => store.deleteTimeEntry(key, id),
    stopTimer: store.stopTimer,
    signOut: store.signOut,
  }
}
