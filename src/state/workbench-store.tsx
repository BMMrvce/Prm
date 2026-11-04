'use client'

import { useParams } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { findWorkspace, spaces, starterExpenses } from '@/data/workspaces'
import type { CalendarEntry, ExpenseRecord, SpaceKey, WorkspaceTask } from '@/types/workbench'

type BySpace<T> = Record<SpaceKey, T>

const STORAGE_KEYS = {
  tasks: 'workbench-tasks',
  calendar: 'workbench-calendar',
  expenses: 'workbench-expenses',
} as const

const taskPrefix: BySpace<string> = { office: 'WR', studio: 'ST', personal: 'PS' }

type WorkbenchState = {
  tasksBySpace: BySpace<WorkspaceTask[]>
  calendarBySpace: BySpace<CalendarEntry[]>
  plansBySpace: BySpace<boolean[]>
  expensesBySpace: BySpace<ExpenseRecord[]>
  toggleTask: (space: SpaceKey, id: string) => void
  addTask: (space: SpaceKey, title: string) => void
  addCalendarEntry: (space: SpaceKey, entry: CalendarEntry) => void
  togglePlan: (space: SpaceKey, index: number) => void
  addExpense: (space: SpaceKey, record: ExpenseRecord) => void
  toast: string | null
  showToast: (message: string, durationMs?: number) => void
}

const WorkbenchContext = createContext<WorkbenchState | null>(null)

function readStorage<T>(key: string): T | null {
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : null
  } catch {
    // Keep starter workspace data if browser storage is unavailable.
    return null
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked; the in-memory state still works.
  }
}

/**
 * Client-side store for every workspace. It lives in the `(workspace)` layout so
 * state survives navigation between routes and workspaces, and it persists
 * tasks, calendar entries and expenses to localStorage.
 */
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [tasksBySpace, setTasksBySpace] = useState<BySpace<WorkspaceTask[]>>({
    office: spaces.office.tasks,
    studio: spaces.studio.tasks,
    personal: spaces.personal.tasks,
  })
  const [calendarBySpace, setCalendarBySpace] = useState<BySpace<CalendarEntry[]>>({
    office: spaces.office.calendar,
    studio: spaces.studio.calendar,
    personal: spaces.personal.calendar,
  })
  const [plansBySpace, setPlansBySpace] = useState<BySpace<boolean[]>>({
    office: [false, false, false],
    studio: [false, false, false],
    personal: [false, false, false],
  })
  const [expensesBySpace, setExpensesBySpace] = useState<BySpace<ExpenseRecord[]>>(starterExpenses)
  const [hydrated, setHydrated] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const savedTasks = readStorage<BySpace<WorkspaceTask[]>>(STORAGE_KEYS.tasks)
    const savedCalendar = readStorage<BySpace<CalendarEntry[]>>(STORAGE_KEYS.calendar)
    const savedExpenses = readStorage<BySpace<ExpenseRecord[]>>(STORAGE_KEYS.expenses)
    if (savedTasks) setTasksBySpace(savedTasks)
    if (savedCalendar) setCalendarBySpace(savedCalendar)
    if (savedExpenses) setExpensesBySpace(savedExpenses)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writeStorage(STORAGE_KEYS.tasks, tasksBySpace)
    writeStorage(STORAGE_KEYS.calendar, calendarBySpace)
    writeStorage(STORAGE_KEYS.expenses, expensesBySpace)
  }, [calendarBySpace, expensesBySpace, hydrated, tasksBySpace])

  const showToast = useCallback((message: string, durationMs = 2000) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), durationMs)
  }, [])

  const toggleTask = useCallback((space: SpaceKey, id: string) => {
    setTasksBySpace((current) => ({
      ...current,
      [space]: current[space].map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    }))
  }, [])

  const addTask = useCallback(
    (space: SpaceKey, title: string) => {
      setTasksBySpace((current) => ({
        ...current,
        [space]: [
          ...current[space],
          {
            id: `${taskPrefix[space]}-${Date.now().toString().slice(-3)}`,
            title,
            meta: 'Today · 0:00 / 30m',
            priority: 'Medium',
          },
        ],
      }))
      showToast('Task added.')
    },
    [showToast],
  )

  const addCalendarEntry = useCallback(
    (space: SpaceKey, entry: CalendarEntry) => {
      setCalendarBySpace((current) => {
        const existing = current[space].some((item) => item.day === entry.day)
        return {
          ...current,
          [space]: existing
            ? current[space].map((item) =>
                item.day === entry.day
                  ? { ...item, meeting: `${item.meeting} · ${entry.meeting}` }
                  : item,
              )
            : [...current[space], entry],
        }
      })
      showToast('Calendar item added.')
    },
    [showToast],
  )

  const togglePlan = useCallback((space: SpaceKey, index: number) => {
    setPlansBySpace((current) => ({
      ...current,
      [space]: current[space].map((done, itemIndex) => (itemIndex === index ? !done : done)),
    }))
  }, [])

  const addExpense = useCallback(
    (space: SpaceKey, record: ExpenseRecord) => {
      setExpensesBySpace((current) => ({
        ...current,
        [space]: [record, ...current[space]],
      }))
      showToast(space === 'office' ? 'Reimbursement submitted.' : 'Expense saved.', 2500)
    },
    [showToast],
  )

  const value = useMemo(
    () => ({
      tasksBySpace,
      calendarBySpace,
      plansBySpace,
      expensesBySpace,
      toggleTask,
      addTask,
      addCalendarEntry,
      togglePlan,
      addExpense,
      toast,
      showToast,
    }),
    [
      tasksBySpace,
      calendarBySpace,
      plansBySpace,
      expensesBySpace,
      toggleTask,
      addTask,
      addCalendarEntry,
      togglePlan,
      addExpense,
      toast,
      showToast,
    ],
  )

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>
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
  const workspace = findWorkspace(space)
  if (!workspace) throw new Error(`Unknown workspace "${space}"`)
  const store = useWorkbench()
  const key = workspace.key

  return {
    workspace,
    tasks: store.tasksBySpace[key],
    calendar: store.calendarBySpace[key],
    plan: store.plansBySpace[key],
    expenses: store.expensesBySpace[key],
    toggleTask: (id: string) => store.toggleTask(key, id),
    addTask: (title: string) => store.addTask(key, title),
    addCalendarEntry: (entry: CalendarEntry) => store.addCalendarEntry(key, entry),
    togglePlan: (index: number) => store.togglePlan(key, index),
    addExpense: (record: ExpenseRecord) => store.addExpense(key, record),
  }
}
