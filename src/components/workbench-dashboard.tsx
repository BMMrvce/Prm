'use client'

import {
  Bell,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Inbox,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

type SpaceKey = 'office' | 'studio' | 'personal'

type WorkspaceTask = {
  id: string
  title: string
  meta: string
  priority: 'High' | 'Medium' | 'Low'
  done?: boolean
}

type CalendarEntry = {
  day: string
  date: string
  meeting: string
  task: string
  taskTone?: 'green' | 'blue'
}

type WorkspaceData = {
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

const spaces: Record<SpaceKey, WorkspaceData> = {
  office: {
    key: 'office',
    switchLabel: 'Acme',
    name: 'Acme Workspace',
    initials: 'ME',
    greeting: 'Good morning · Mon, 2 Nov',
    alert: 'Sprint planning starts in 30 min',
    alertMeta: '10:00 · Meeting room 2',
    projects: ['Website Revamp', 'Mobile App', 'Marketing'],
    tasks: [
      {
        id: 'WR-24',
        title: 'Review homepage wireframes',
        meta: 'Today · 0:42 / 2h',
        priority: 'High',
      },
      {
        id: 'WR-25',
        title: 'Reply to vendor invoice',
        meta: 'Tue 3 · 0:00 / 30m',
        priority: 'High',
      },
      {
        id: 'WR-26',
        title: 'Prepare sprint demo',
        meta: 'Wed 4 · 0:00 / 1h',
        priority: 'Medium',
      },
      {
        id: 'WR-27',
        title: 'Update roadmap',
        meta: 'Done · 1h 10m / 1h',
        priority: 'Low',
        done: true,
      },
      {
        id: 'WR-28',
        title: 'Book design review',
        meta: 'Done · 0:10 / 15m',
        priority: 'Low',
        done: true,
      },
    ],
    timer: {
      title: 'Review homepage wireframes',
      elapsed: '00:42:10',
      estimate: 'of 2h estimate',
    },
    calendar: [
      { day: 'Mon', date: '2', meeting: 'Sprint planning', task: 'Review wireframes' },
      { day: 'Tue', date: '3', meeting: 'Design sync', task: 'Send invoice' },
      { day: 'Wed', date: '4', meeting: 'Client call', task: 'Ship v1.2', taskTone: 'green' },
      { day: 'Thu', date: '5', meeting: 'Retro', task: 'Write release notes' },
      { day: 'Fri', date: '6', meeting: '1:1 · Sara', task: 'Plan next sprint' },
    ],
    note: 'Focus: finish wireframes before noon. Ask Sara about API limits. Share demo link with the client.',
    email: 'client@example.com',
    plan: ['Finalize design', 'Dev handoff', 'QA and release'],
    activity: [
      'Sara moved “Login flow” to Review',
      'Dev commented on “API docs”',
      'New invoice from Acme Corp',
      'Sprint 14 starts tomorrow',
    ],
    mailProvider: 'Hostinger Mail',
  },
  studio: {
    key: 'studio',
    switchLabel: 'Studio',
    name: 'Northstar Studio',
    initials: 'MS',
    greeting: 'Studio overview · Mon, 2 Nov',
    alert: 'Sprint planning starts in 30 min',
    alertMeta: '10:00 · Product room',
    projects: ['Client Portal', 'Mobile App', 'Design System'],
    tasks: [
      {
        id: 'ST-24',
        title: 'Review homepage wireframes',
        meta: 'Today · 0:42 / 2h',
        priority: 'High',
      },
      {
        id: 'ST-31',
        title: 'Reply to client feedback',
        meta: 'Tue 3 · 0:00 / 30m',
        priority: 'High',
      },
      { id: 'ST-36', title: 'Prepare sprint demo', meta: 'Wed 4 · 0:00 / 1h', priority: 'Medium' },
      {
        id: 'ST-19',
        title: 'Update product roadmap',
        meta: 'Done · 1h 10m / 1h',
        priority: 'Low',
        done: true,
      },
      {
        id: 'ST-15',
        title: 'Book design review',
        meta: 'Done · 0:10 / 15m',
        priority: 'Low',
        done: true,
      },
    ],
    timer: { title: 'Review homepage wireframes', elapsed: '00:42:10', estimate: 'of 2h estimate' },
    calendar: [
      { day: 'Mon', date: '2', meeting: 'Sprint planning', task: 'Review wireframes' },
      { day: 'Tue', date: '3', meeting: 'Design sync', task: 'Send invoice' },
      { day: 'Wed', date: '4', meeting: 'Client call', task: 'Ship v1.2', taskTone: 'green' },
      { day: 'Thu', date: '5', meeting: 'Retro', task: 'Release notes' },
      { day: 'Fri', date: '6', meeting: '1:1 · Alex', task: 'Plan next sprint' },
    ],
    note: 'Focus: finish wireframes before noon. Ask Sara about API limits. Share the demo link with the client.',
    email: 'client@example.com',
    plan: ['Finalize design', 'Developer handoff', 'QA and release'],
    activity: [
      'Sara moved “Login flow” to Review',
      'Dev commented on “API docs”',
      'New email from Acme Corp',
      'Sprint 14 starts tomorrow',
    ],
    mailProvider: 'Outlook',
  },
  personal: {
    key: 'personal',
    switchLabel: 'Personal',
    name: 'Morgan’s Space',
    initials: 'ME',
    greeting: 'Your day · Mon, 2 Nov',
    alert: 'Dentist appointment in 45 min',
    alertMeta: '10:15 · Market Street',
    projects: ['Home', 'Learning', 'Health & Fitness'],
    tasks: [
      { id: 'PS-09', title: 'Renew home insurance', meta: 'Today · 0:10 / 30m', priority: 'High' },
      {
        id: 'PS-14',
        title: 'Finish TypeScript course',
        meta: 'Tue 3 · 1:20 / 2h',
        priority: 'Medium',
      },
      {
        id: 'PS-17',
        title: 'Plan weekend groceries',
        meta: 'Wed 4 · 0:00 / 30m',
        priority: 'Medium',
      },
      { id: 'PS-05', title: 'Morning run', meta: 'Done · 0:42 / 45m', priority: 'Low', done: true },
      { id: 'PS-02', title: 'Call family', meta: 'Done · 0:25 / 30m', priority: 'Low', done: true },
    ],
    timer: { title: 'Finish TypeScript course', elapsed: '01:20:08', estimate: 'of 2h estimate' },
    calendar: [
      { day: 'Mon', date: '2', meeting: 'Dentist · 10:15', task: 'Renew insurance' },
      { day: 'Tue', date: '3', meeting: 'Gym · 18:00', task: 'TypeScript course' },
      {
        day: 'Wed',
        date: '4',
        meeting: 'Dinner · 19:30',
        task: 'Buy groceries',
        taskTone: 'green',
      },
      { day: 'Thu', date: '5', meeting: 'Run · 07:00', task: 'Read chapter 6' },
      { day: 'Fri', date: '6', meeting: 'Movie · 20:00', task: 'Plan weekend' },
    ],
    note: 'Keep the afternoon quiet for learning. Pick up groceries after work and remember to call Mum tonight.',
    email: 'family@example.com',
    plan: ['Renew insurance', 'Study for 45 minutes', 'Plan weekend meals'],
    activity: [
      'Completed your morning run',
      'Course progress reached 68%',
      'Insurance renewal is due today',
      'Dinner reservation confirmed',
    ],
    mailProvider: 'Gmail',
  },
}

const mainNav = ['Home', 'My Tasks', 'Inbox', 'Calendar']
const manageNav = ['All Projects', 'Integrations', 'Settings']

function priorityStyle(priority: WorkspaceTask['priority']) {
  if (priority === 'High') return 'bg-[#fde8e8] text-[#a52828]'
  if (priority === 'Medium') return 'bg-[#fff5cf] text-[#8b5e00]'
  return 'bg-[#e4f8ea] text-[#317a4b]'
}

function noteItems(value: string) {
  return value
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)
}

function SquareCheck({
  checked,
  onClick,
  label,
}: {
  checked: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-[17px] shrink-0 place-items-center rounded-[2px] border text-white ${
        checked ? 'border-[#4a3fd1] bg-[#4a3fd1]' : 'border-[#858585] bg-white'
      }`}
      aria-label={label}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  )
}

function WorkspaceSwitcher({
  active,
  onChange,
}: {
  active: SpaceKey
  onChange: (key: SpaceKey) => void
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Switch dashboard">
      {(Object.keys(spaces) as SpaceKey[]).map((key) => (
        <button
          type="button"
          key={key}
          onClick={() => onChange(key)}
          className={`h-9 rounded-lg border px-3.5 text-[15px] font-medium transition ${
            active === key
              ? 'border-[#4638ca] bg-[#4638ca] text-white'
              : 'border-[#d8d8dc] bg-white text-[#2f2f33] hover:bg-[#f4f4f6]'
          }`}
        >
          {spaces[key].switchLabel}
        </button>
      ))}
    </div>
  )
}

function Sidebar({
  workspace,
  activeNav,
  onNavigate,
  open,
  desktopVisible,
  onClose,
}: {
  workspace: WorkspaceData
  activeNav: string
  onNavigate: (item: string) => void
  open: boolean
  desktopVisible: boolean
  onClose: () => void
}) {
  const workspaceNav = [...mainNav, workspace.key === 'office' ? 'Reimbursements' : 'Expenses']
  const navButton = (item: string) => (
    <button
      type="button"
      key={item}
      onClick={() => {
        onNavigate(item)
        onClose()
      }}
      className={`w-full rounded-md px-3 py-2 text-left text-[15px] transition ${
        activeNav === item
          ? 'bg-[#eeeeff] font-medium text-[#231a8f]'
          : 'text-[#36363a] hover:bg-[#f5f5f7]'
      }`}
    >
      {item}
    </button>
  )

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[246px] flex-col border-r border-[#dedee2] bg-white px-3 py-6 transition-transform lg:static lg:translate-x-0 ${
          desktopVisible ? 'lg:flex' : 'lg:hidden'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-3 flex items-center justify-between px-2">
          <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-[#111114]">
            {workspace.name}
          </h1>
          <button className="p-1 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-0.5" aria-label="Workspace navigation">
          {workspaceNav.map(navButton)}
        </nav>
        <p className="mb-1 mt-5 px-3 text-[12px] uppercase tracking-[0.08em] text-[#66666c]">
          Projects
        </p>
        <nav className="space-y-0.5" aria-label="Projects">
          {workspace.projects.map(navButton)}
        </nav>
        <p className="mb-1 mt-5 px-3 text-[12px] uppercase tracking-[0.08em] text-[#66666c]">
          Manage
        </p>
        <nav className="space-y-0.5" aria-label="Management">
          {manageNav.map(navButton)}
        </nav>
        <div className="mt-auto border-t border-[#ececf0] pt-4 lg:hidden">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-8 place-items-center rounded-full bg-[#eef0ff] text-[11px] font-semibold text-[#2721a6]">
              {workspace.initials}
            </span>
            <div>
              <p className="text-[13px] font-medium text-[#202024]">Morgan Ellis</p>
              <p className="text-[11px] text-[#77777d]">{workspace.switchLabel} workspace</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function TaskList({
  workspace,
  tasks,
  onToggle,
  onAdd,
}: {
  workspace: WorkspaceData
  tasks: WorkspaceTask[]
  onToggle: (id: string) => void
  onAdd: (title: string) => void
}) {
  const [newTask, setNewTask] = useState('')
  const remaining = tasks.filter((task) => !task.done).length
  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTask.trim()) return
    onAdd(newTask.trim())
    setNewTask('')
  }
  return (
    <section className="neo-card flex min-h-[437px] max-w-full flex-col overflow-hidden rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">To Do</h2>
        <span className="text-[13px] text-[#66666d]">
          {remaining} of {tasks.length} left
        </span>
      </div>
      <div className="space-y-4">
        {tasks.map((task) => (
          <div className="flex items-start gap-3" key={task.id}>
            <SquareCheck
              checked={Boolean(task.done)}
              onClick={() => onToggle(task.id)}
              label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[15px] leading-[18px] text-[#222226] ${task.done ? 'text-[#55555a]' : ''}`}
              >
                {task.title}
              </p>
              <p className="mt-0.5 text-[12px] text-[#67676c]">{task.meta}</p>
            </div>
            <span
              className={`hidden rounded-full px-2.5 py-0.5 text-[11px] sm:inline ${priorityStyle(task.priority)}`}
            >
              {task.priority}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={addTask} className="mt-3 flex gap-2">
        <input
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8d8dc] bg-white px-3 text-xs outline-none focus:border-[#493bd0]"
          placeholder="Add a to-do item"
          aria-label="New to-do item"
        />
        <button
          type="submit"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#493bd0] text-white"
          aria-label="Add to-do item"
        >
          <Plus size={15} />
        </button>
      </form>
      <div className="neo-inset mt-auto rounded-lg p-2.5">
        <div className="flex items-center justify-between text-[11px] text-[#555561]">
          <span>Now tracking</span>
          <span className="text-[#392eb5]">Running</span>
        </div>
        <p className="mt-1 truncate text-[13px] font-medium">{workspace.timer.title}</p>
        <div className="mt-1 flex items-end justify-between">
          <span className="text-[20px] font-semibold leading-none tracking-[-0.03em]">
            {workspace.timer.elapsed}
          </span>
          <span className="text-[12px] text-[#6b6b71]">{workspace.timer.estimate}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3e1f8]">
          <div className="h-full w-[34%] rounded-full bg-[#4a3fd1]" />
        </div>
      </div>
    </section>
  )
}

function CalendarPanel({
  entries,
  onAdd,
}: {
  entries: CalendarEntry[]
  onAdd: (entry: CalendarEntry) => void
}) {
  const [range, setRange] = useState<'Day' | 'Week'>('Week')
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('Mon')
  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    const existing = entries.find((entry) => entry.day === day)
    onAdd({
      day,
      date: existing?.date ?? '2',
      meeting: title.trim(),
      task: existing?.task ?? 'Open schedule',
    })
    setTitle('')
    setShowAdd(false)
  }
  return (
    <section className="neo-card min-h-[437px] overflow-hidden rounded-xl p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Calendar view</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdd((visible) => !visible)}
            className="grid size-9 place-items-center rounded-lg border border-[#d8d8dc] bg-white text-[#493bd0]"
            aria-label="Add calendar item"
          >
            <Plus size={15} />
          </button>
          {(['Day', 'Week'] as const).map((item) => (
            <button
              type="button"
              onClick={() => setRange(item)}
              key={item}
              className={`h-9 rounded-lg border px-4 text-[14px] ${
                range === item
                  ? 'border-[#4638ca] bg-[#4638ca] text-white'
                  : 'border-[#d8d8dc] bg-white text-[#333338]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {showAdd && (
        <form onSubmit={addEvent} className="mb-3 grid grid-cols-[90px_minmax(0,1fr)_auto] gap-2">
          <select
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="h-9 rounded-lg border border-[#d8d8dc] bg-white px-2 text-xs"
            aria-label="Calendar day"
          >
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-9 min-w-0 rounded-lg border border-[#d8d8dc] px-3 text-xs outline-none focus:border-[#493bd0]"
            placeholder="Meeting or event title"
            aria-label="Calendar item title"
          />
          <button
            className="h-9 rounded-lg bg-[#493bd0] px-3 text-xs font-medium text-white"
            type="submit"
          >
            Add
          </button>
        </form>
      )}
      <div
        className={`grid min-h-[361px] gap-2 ${
          range === 'Week'
            ? 'grid-cols-2 md:grid-cols-[196px_179px_161px_200px_196px] md:gap-2.5'
            : 'grid-cols-1'
        }`}
      >
        {(range === 'Week' ? entries : entries.slice(0, 1)).map((day, index) => (
          <div className="neo-inset rounded-lg p-2.5" key={`${day.day}-${index}`}>
            <p className="text-[13px] text-[#616168]">
              {day.day} {day.date}
            </p>
            <div className="mt-2 truncate rounded-full bg-[#fff4c8] px-2 py-1 text-[11px] text-[#7d5b00]">
              Meeting · {day.meeting}
            </div>
            <div
              className={`mt-2 truncate rounded-full px-2 py-1 text-[11px] ${day.taskTone === 'green' ? 'bg-[#e4f8e8] text-[#2f7045]' : 'bg-[#eeedff] text-[#3e34ad]'}`}
            >
              Task · {day.task}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BottomPanels({
  workspace,
  plan,
  onTogglePlan,
}: {
  workspace: WorkspaceData
  plan: boolean[]
  onTogglePlan: (index: number) => void
}) {
  const [notes, setNotes] = useState<string[]>(() => noteItems(workspace.note))
  const [newNote, setNewNote] = useState('')
  const [mailTab, setMailTab] = useState<'Inbox' | 'Sent'>('Inbox')
  const [mailLoading, setMailLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [email, setEmail] = useState(`To: ${workspace.email}`)
  const [subject, setSubject] = useState('')
  const [sent, setSent] = useState(false)
  const mailbox = {
    Inbox: [
      {
        subject:
          workspace.key === 'office'
            ? 'Expense policy update'
            : workspace.key === 'studio'
              ? 'Homepage review notes'
              : 'Your weekly summary',
        from:
          workspace.key === 'office'
            ? 'hr@acme.co'
            : workspace.key === 'studio'
              ? 'client@example.com'
              : 'me@gmail.com',
      },
      {
        subject:
          workspace.key === 'office'
            ? 'Invoice #4021 is ready'
            : workspace.key === 'studio'
              ? 'Sprint 14 planning'
              : 'Receipt from City Market',
        from:
          workspace.key === 'office'
            ? 'finance@acme.co'
            : workspace.key === 'studio'
              ? 'team@studio.co'
              : 'receipts@gmail.com',
      },
    ],
    Sent: [
      {
        subject:
          workspace.key === 'office'
            ? 'Re: Quarterly planning'
            : workspace.key === 'studio'
              ? 'Project status update'
              : 'Weekend plans',
        from: workspace.email,
      },
      { subject: 'Follow-up and next steps', from: workspace.email },
    ],
  }

  useEffect(() => {
    setNotes(noteItems(workspace.note))
    setNewNote('')
    setMailTab('Inbox')
    setMailLoading(true)
    setComposing(false)
    setEmail(`To: ${workspace.email}`)
    setSubject('')
    setSent(false)
    const timeout = window.setTimeout(() => setMailLoading(false), 450)
    return () => window.clearTimeout(timeout)
  }, [workspace])

  const refreshMail = () => {
    setMailLoading(true)
    window.setTimeout(() => setMailLoading(false), 550)
  }

  const addNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newNote.trim()) return
    setNotes((items) => [...items, newNote.trim()])
    setNewNote('')
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <section className="neo-card min-h-[330px] rounded-xl p-4">
        <h2 className="text-[15px] font-semibold">Day Note</h2>
        <ul className="mt-3 min-h-[220px] list-disc space-y-2 pl-5 text-[13px] leading-5 text-[#5c5c62]">
          {notes.map((note, index) => (
            <li className="group" key={`${note}-${index}`}>
              <span>{note}</span>
              <button
                type="button"
                onClick={() =>
                  setNotes((items) => items.filter((_, itemIndex) => itemIndex !== index))
                }
                className="ml-2 text-[10px] text-[#a0a0a6] opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${note}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addNote} className="flex gap-2">
          <input
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8d8dc] px-3 text-xs outline-none focus:border-[#493bd0]"
            placeholder="Add a bullet"
            aria-label="New day note"
          />
          <button
            type="submit"
            className="grid size-9 place-items-center rounded-lg bg-[#493bd0] text-white"
            aria-label="Add day note"
          >
            <Plus size={14} />
          </button>
        </form>
      </section>

      <section className="neo-card flex min-h-[330px] flex-col rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Mail</h2>
            <p className="text-[10px] text-[#77777d]">{workspace.mailProvider}</p>
          </div>
          <button
            type="button"
            onClick={() => setComposing((value) => !value)}
            className="rounded-lg bg-[#493bd0] px-2.5 py-1.5 text-[10px] font-medium text-white"
          >
            {composing ? 'Close' : 'Compose'}
          </button>
        </div>
        {composing ? (
          <>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="neo-inset mt-3 h-9 rounded-lg px-3 text-xs outline-none"
              aria-label="Email recipient"
            />
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="neo-inset mt-2 h-9 rounded-lg px-3 text-xs outline-none"
              aria-label="Email subject"
              placeholder="Subject"
            />
            <button
              type="button"
              onClick={() => setSent(true)}
              className="mt-auto h-9 rounded-lg bg-[#493bd0] text-xs font-medium text-white"
            >
              {sent ? 'Email queued' : 'Send'}
            </button>
          </>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-1 border-b border-[#e8e8eb]">
              {(['Inbox', 'Sent'] as const).map((tab) => (
                <button
                  type="button"
                  onClick={() => setMailTab(tab)}
                  className={`border-b-2 px-2 py-2 text-xs font-medium ${mailTab === tab ? 'border-[#493bd0] text-[#493bd0]' : 'border-transparent text-[#77777d]'}`}
                  key={tab}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                onClick={refreshMail}
                className="ml-auto text-[10px] font-medium text-[#493bd0]"
              >
                {mailLoading ? 'Syncing…' : 'Refresh'}
              </button>
            </div>
            <div className="divide-y divide-[#eeeeef]">
              {mailLoading ? (
                <p className="py-5 text-center text-xs text-[#88888e]">
                  Fetching {mailTab.toLowerCase()}…
                </p>
              ) : (
                mailbox[mailTab].map((message) => (
                  <button type="button" className="w-full py-3 text-left" key={message.subject}>
                    <p className="truncate text-xs font-medium">{message.subject}</p>
                    <p className="mt-1 truncate text-[10px] text-[#77777d]">
                      {mailTab === 'Inbox' ? `From ${message.from}` : `From ${message.from}`}
                    </p>
                  </button>
                ))
              )}
            </div>
            <p className="mt-auto text-[9px] text-[#99999f]">
              Demo mailbox; live sync activates after authenticated provider connection.
            </p>
          </>
        )}
      </section>

      <section className="neo-card min-h-[330px] rounded-xl p-4">
        <h2 className="text-[15px] font-semibold">Plan of Action</h2>
        <div className="mt-4 space-y-5">
          {workspace.plan.map((item, index) => (
            <div className="flex items-center gap-3" key={item}>
              <SquareCheck
                checked={plan[index]}
                onClick={() => onTogglePlan(index)}
                label={`Complete ${item}`}
              />
              <span className={`text-[14px] ${plan[index] ? 'text-[#77777d] line-through' : ''}`}>
                {index + 1}. {item}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="neo-card min-h-[330px] rounded-xl p-4">
        <h2 className="text-[15px] font-semibold">What’s Cooking</h2>
        <div className="mt-4 space-y-3">
          {workspace.activity.map((item) => (
            <p className="text-[13px] leading-5 text-[#66666c]" key={item}>
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  )
}

type ExpenseRecord = {
  id: string
  date: string
  description: string
  category: string
  amount: number
  status: 'Pending' | 'Approved' | 'Paid' | 'Recorded'
}

const starterExpenses: Record<SpaceKey, ExpenseRecord[]> = {
  office: [
    {
      id: 'RB-104',
      date: '2026-11-02',
      description: 'Client lunch',
      category: 'Meals',
      amount: 84.5,
      status: 'Pending',
    },
    {
      id: 'RB-098',
      date: '2026-10-29',
      description: 'Airport transfer',
      category: 'Travel',
      amount: 62,
      status: 'Approved',
    },
  ],
  studio: [
    {
      id: 'EX-221',
      date: '2026-11-01',
      description: 'Figma subscription',
      category: 'Software',
      amount: 15,
      status: 'Recorded',
    },
    {
      id: 'EX-219',
      date: '2026-10-30',
      description: 'Cloud hosting',
      category: 'Infrastructure',
      amount: 128.4,
      status: 'Recorded',
    },
  ],
  personal: [
    {
      id: 'PE-045',
      date: '2026-11-02',
      description: 'Weekly groceries',
      category: 'Food',
      amount: 73.2,
      status: 'Recorded',
    },
    {
      id: 'PE-044',
      date: '2026-11-01',
      description: 'Train pass',
      category: 'Transport',
      amount: 42,
      status: 'Recorded',
    },
  ],
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function ExpenseTracker({
  workspace,
  records,
  onAdd,
}: {
  workspace: WorkspaceData
  records: ExpenseRecord[]
  onAdd: (record: ExpenseRecord) => void
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(workspace.key === 'office' ? 'Travel' : 'Software')
  const total = records.reduce((sum, record) => sum + record.amount, 0)
  const pending = records
    .filter((record) => record.status === 'Pending')
    .reduce((sum, record) => sum + record.amount, 0)
  const isOffice = workspace.key === 'office'

  useEffect(() => {
    setDescription('')
    setAmount('')
    setCategory(
      workspace.key === 'office' ? 'Travel' : workspace.key === 'studio' ? 'Software' : 'Food',
    )
  }, [workspace.key])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    onAdd({
      id: `${isOffice ? 'RB' : workspace.key === 'studio' ? 'EX' : 'PE'}-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().slice(0, 10),
      description: description.trim(),
      category,
      amount: parsedAmount,
      status: isOffice ? 'Pending' : 'Recorded',
    })
    setDescription('')
    setAmount('')
  }

  const exportCsv = () => {
    const rows = [
      ['ID', 'Date', 'Description', 'Category', 'Amount', 'Status'],
      ...records.map((record) => [
        record.id,
        record.date,
        record.description,
        record.category,
        record.amount.toFixed(2),
        record.status,
      ]),
    ]
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${workspace.key}-expenses.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="neo-card rounded-xl p-4">
          <p className="text-xs text-[#73737a]">
            {isOffice ? 'Claims this month' : 'Spent this month'}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{money(total)}</p>
        </div>
        <div className="neo-card rounded-xl p-4">
          <p className="text-xs text-[#73737a]">
            {isOffice ? 'Awaiting approval' : 'Average transaction'}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {money(isOffice ? pending : records.length ? total / records.length : 0)}
          </p>
        </div>
        <div className="neo-card rounded-xl p-4">
          <p className="text-xs text-[#73737a]">Entries</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{records.length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="neo-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[#eeedff] text-[#4638ca]">
              <CircleDollarSign size={19} />
            </span>
            <div>
              <h3 className="font-semibold">{isOffice ? 'Log reimbursement' : 'Add expense'}</h3>
              <p className="text-xs text-[#73737a]">
                {isOffice
                  ? 'Submit an amount for approval'
                  : `Track ${workspace.switchLabel.toLowerCase()} spending`}
              </p>
            </div>
          </div>
          <label className="mt-5 block text-xs font-medium text-[#55555c]">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]"
              placeholder={isOffice ? 'Taxi, meal, equipment…' : 'What did you purchase?'}
              required
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#55555c]">
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
            </label>
            <label className="block text-xs font-medium text-[#55555c]">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]"
              >
                {(isOffice
                  ? ['Travel', 'Meals', 'Equipment', 'Other']
                  : workspace.key === 'studio'
                    ? ['Software', 'Infrastructure', 'Contractors', 'Marketing']
                    : ['Food', 'Transport', 'Home', 'Health', 'Leisure']
                ).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#493bd0] text-sm font-medium text-white hover:bg-[#382bb9]"
            type="submit"
          >
            <Plus size={16} />
            {isOffice ? 'Submit reimbursement' : 'Save expense'}
          </button>
        </form>

        <section className="neo-card overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-[#e4e4e7] px-5 py-4">
            <div>
              <h3 className="font-semibold">
                {isOffice ? 'Reimbursement history' : 'Recent expenses'}
              </h3>
              <p className="text-xs text-[#73737a]">
                Saved on this device and ready for Supabase sync
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium"
            >
              Export CSV
            </button>
          </div>
          <div className="divide-y divide-[#eeeeef]">
            {records.map((record) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[90px_1fr_120px_100px_auto]"
                key={record.id}
              >
                <span className="hidden text-xs text-[#77777d] sm:block">{record.date}</span>
                <div>
                  <p className="text-sm font-medium">{record.description}</p>
                  <p className="mt-0.5 text-xs text-[#77777d] sm:hidden">
                    {record.date} · {record.category}
                  </p>
                </div>
                <span className="hidden text-xs text-[#55555c] sm:block">{record.category}</span>
                <span
                  className={`hidden w-fit rounded-full px-2 py-1 text-[10px] font-medium sm:block ${
                    record.status === 'Pending'
                      ? 'bg-[#fff4cf] text-[#8a6100]'
                      : record.status === 'Approved'
                        ? 'bg-[#e6f7ea] text-[#2f7045]'
                        : 'bg-[#eeedff] text-[#3d34aa]'
                  }`}
                >
                  {record.status}
                </span>
                <span className="text-sm font-semibold">{money(record.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function WorkspacePage({
  activeNav,
  workspace,
  tasks,
  onToggleTask,
  onAddTask,
  calendar,
  onAddCalendar,
  expenses,
  onAddExpense,
}: {
  activeNav: string
  workspace: WorkspaceData
  tasks: WorkspaceTask[]
  onToggleTask: (id: string) => void
  onAddTask: (title: string) => void
  calendar: CalendarEntry[]
  onAddCalendar: (entry: CalendarEntry) => void
  expenses: ExpenseRecord[]
  onAddExpense: (record: ExpenseRecord) => void
}) {
  if (activeNav === 'Reimbursements' || activeNav === 'Expenses') {
    return <ExpenseTracker workspace={workspace} records={expenses} onAdd={onAddExpense} />
  }

  if (activeNav === 'Calendar') {
    return <CalendarPanel entries={calendar} onAdd={onAddCalendar} />
  }

  if (activeNav === 'My Tasks') {
    return (
      <section className="neo-card overflow-hidden rounded-xl">
        <div className="border-b border-[#e4e4e7] px-5 py-4">
          <h3 className="font-semibold">All assigned tasks</h3>
          <p className="text-xs text-[#73737a]">
            {tasks.filter((task) => !task.done).length} open tasks across this workspace
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const input = form.elements.namedItem('task-title') as HTMLInputElement
            if (!input.value.trim()) return
            onAddTask(input.value.trim())
            form.reset()
          }}
          className="flex gap-2 border-b border-[#eeeeef] p-4"
        >
          <input
            name="task-title"
            className="h-10 min-w-0 flex-1 rounded-lg border border-[#d8d8dc] px-3 text-sm outline-none focus:border-[#493bd0]"
            placeholder="Add a task"
          />
          <button
            className="rounded-lg bg-[#493bd0] px-4 text-sm font-medium text-white"
            type="submit"
          >
            Add task
          </button>
        </form>
        <div className="divide-y divide-[#eeeeef]">
          {tasks.map((task) => (
            <div
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#fafaff]"
              key={task.id}
            >
              <SquareCheck
                checked={Boolean(task.done)}
                onClick={() => onToggleTask(task.id)}
                label={`Toggle ${task.title}`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${task.done ? 'text-[#88888e] line-through' : ''}`}
                >
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-[#77777d]">
                  {task.id} · {task.meta}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] ${priorityStyle(task.priority)}`}
              >
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (activeNav === 'Inbox') {
    const provider = workspace.mailProvider
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="neo-card overflow-hidden rounded-xl">
          <div className="border-b border-[#e4e4e7] px-5 py-4">
            <h3 className="font-semibold">Unified inbox</h3>
            <p className="text-xs text-[#73737a]">{provider} and workspace updates</p>
          </div>
          {[
            'Please review the latest proposal',
            'Meeting notes and next steps',
            'Invoice ready for approval',
            'You were mentioned in a task',
          ].map((message, index) => (
            <button
              className="flex w-full gap-3 border-b border-[#eeeeef] px-5 py-4 text-left hover:bg-[#fafaff]"
              key={message}
            >
              <span
                className={`mt-1 size-2 rounded-full ${index < 2 ? 'bg-[#493bd0]' : 'bg-[#c7c7cc]'}`}
              />
              <div>
                <p className="text-sm font-medium">{message}</p>
                <p className="mt-1 text-xs text-[#77777d]">
                  {provider} · {index + 1}h ago
                </p>
              </div>
            </button>
          ))}
        </section>
        <section className="neo-card rounded-xl p-5">
          <h3 className="font-semibold">Connected mailbox</h3>
          <div className="mt-4 rounded-lg border border-[#e4e4e7] p-4">
            <p className="text-sm font-medium">{provider}</p>
            <p className="mt-1 text-xs text-[#77777d]">Configured for {workspace.switchLabel}</p>
            <span className="mt-3 inline-flex rounded-full bg-[#e6f7ea] px-2 py-1 text-[10px] font-medium text-[#2f7045]">
              Ready to connect
            </span>
          </div>
        </section>
      </div>
    )
  }

  if (activeNav === 'All Projects' || workspace.projects.includes(activeNav)) {
    const projects = activeNav === 'All Projects' ? workspace.projects : [activeNav]
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <button
            type="button"
            className="neo-card rounded-xl p-5 text-left transition hover:border-[#a9a4ec]"
            key={project}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{project}</h3>
              <span className="rounded-full bg-[#e6f7ea] px-2 py-1 text-[10px] text-[#2f7045]">
                On track
              </span>
            </div>
            <p className="mt-2 text-xs text-[#77777d]">
              {workspace.switchLabel} · {4 + index * 3} open tasks
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#eeeeef]">
              <div
                className="h-full rounded-full bg-[#493bd0]"
                style={{ width: `${58 + index * 12}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#77777d]">{58 + index * 12}% complete</p>
          </button>
        ))}
      </div>
    )
  }

  if (activeNav === 'Integrations') {
    const integrations = [
      [workspace.mailProvider, 'Mail and sending'],
      ['Google Calendar', 'Two-way calendar sync'],
      ['Slack', 'Mentions and task creation'],
      ['GitHub', 'Pull requests and status'],
    ]
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map(([name, detail], index) => (
          <div className="neo-card flex items-center gap-4 rounded-xl p-5" key={name}>
            <span className="grid size-10 place-items-center rounded-lg bg-[#eeedff] text-[#493bd0]">
              {index === 0 ? <Inbox size={19} /> : <CheckCircle2 size={19} />}
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{name}</h3>
              <p className="mt-1 text-xs text-[#77777d]">{detail}</p>
            </div>
            <button className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium">
              {index === 0 ? 'Configure' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    )
  }

  if (activeNav === 'Settings') {
    return (
      <section className="neo-card max-w-3xl rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[#493bd0]" />
          <div>
            <h3 className="font-semibold">Workspace settings</h3>
            <p className="text-xs text-[#77777d]">Manage identity and preferences</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#55555c]">
            Workspace name
            <input
              defaultValue={workspace.name}
              className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-[#55555c]">
            Default currency
            <select className="mt-2 h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm">
              <option>USD — US Dollar</option>
              <option>EUR — Euro</option>
              <option>GBP — British Pound</option>
            </select>
          </label>
        </div>
        <button className="mt-6 rounded-lg bg-[#493bd0] px-4 py-2.5 text-sm font-medium text-white">
          Save changes
        </button>
      </section>
    )
  }

  return null
}

function NotificationCenter({
  open,
  onToggle,
  onEnable,
}: {
  open: boolean
  onToggle: () => void
  onEnable: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="neo-control relative grid size-9 place-items-center rounded-lg text-[#4d4d55]"
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell size={17} />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[#f4f6fa] bg-[#493bd0]" />
      </button>
      {open && (
        <div className="neo-card absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-2rem))] rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold">Notifications</h3>
              <p className="text-[11px] text-[#73737a]">Workspace and device alerts</p>
            </div>
            <button
              type="button"
              onClick={onEnable}
              className="rounded-lg bg-[#493bd0] px-3 py-1.5 text-[11px] font-medium text-white"
            >
              Enable popups
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {[
              ['Finance review starts soon', '2 min ago'],
              ['Alex mentioned you in ST-24', '18 min ago'],
              ['Personal reminder: renew insurance', '1 hour ago'],
            ].map(([title, time], index) => (
              <div className="neo-inset flex gap-2 rounded-lg p-2.5" key={title}>
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${index < 2 ? 'bg-[#493bd0]' : 'bg-[#a9a9b0]'}`}
                />
                <div>
                  <p className="text-[12px] font-medium text-[#333338]">{title}</p>
                  <p className="mt-0.5 text-[10px] text-[#818188]">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function WorkbenchDashboard() {
  const [space, setSpace] = useState<SpaceKey>('office')
  const [activeNav, setActiveNav] = useState('Home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [tasksBySpace, setTasksBySpace] = useState<Record<SpaceKey, WorkspaceTask[]>>({
    office: spaces.office.tasks,
    studio: spaces.studio.tasks,
    personal: spaces.personal.tasks,
  })
  const [calendarBySpace, setCalendarBySpace] = useState<Record<SpaceKey, CalendarEntry[]>>({
    office: spaces.office.calendar,
    studio: spaces.studio.calendar,
    personal: spaces.personal.calendar,
  })
  const [workspaceDataHydrated, setWorkspaceDataHydrated] = useState(false)
  const [plansBySpace, setPlansBySpace] = useState<Record<SpaceKey, boolean[]>>({
    office: [false, false, false],
    studio: [false, false, false],
    personal: [false, false, false],
  })
  const [expensesBySpace, setExpensesBySpace] =
    useState<Record<SpaceKey, ExpenseRecord[]>>(starterExpenses)
  const [expensesHydrated, setExpensesHydrated] = useState(false)
  const workspace = spaces[space]
  const tasks = tasksBySpace[space]
  const pageTitle = activeNav === 'Home' ? workspace.greeting : activeNav

  useEffect(() => {
    try {
      const savedTasks = window.localStorage.getItem('workbench-tasks')
      const savedCalendar = window.localStorage.getItem('workbench-calendar')
      if (savedTasks) setTasksBySpace(JSON.parse(savedTasks) as Record<SpaceKey, WorkspaceTask[]>)
      if (savedCalendar) {
        setCalendarBySpace(JSON.parse(savedCalendar) as Record<SpaceKey, CalendarEntry[]>)
      }
    } catch {
      // Keep starter workspace data if browser storage is unavailable.
    } finally {
      setWorkspaceDataHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!workspaceDataHydrated) return
    window.localStorage.setItem('workbench-tasks', JSON.stringify(tasksBySpace))
    window.localStorage.setItem('workbench-calendar', JSON.stringify(calendarBySpace))
  }, [calendarBySpace, tasksBySpace, workspaceDataHydrated])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('workbench-expenses')
      if (saved) setExpensesBySpace(JSON.parse(saved) as Record<SpaceKey, ExpenseRecord[]>)
    } catch {
      // Keep coherent starter records if local browser data is unavailable.
    } finally {
      setExpensesHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!expensesHydrated) return
    window.localStorage.setItem('workbench-expenses', JSON.stringify(expensesBySpace))
  }, [expensesBySpace, expensesHydrated])

  const changeSpace = (next: SpaceKey) => {
    setSpace(next)
    setActiveNav('Home')
    setDismissed(false)
  }

  const toggleTask = (id: string) => {
    setTasksBySpace((current) => ({
      ...current,
      [space]: current[space].map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    }))
  }

  const addTask = (title: string) => {
    setTasksBySpace((current) => ({
      ...current,
      [space]: [
        ...current[space],
        {
          id: `${space === 'office' ? 'WR' : space === 'studio' ? 'ST' : 'PS'}-${Date.now().toString().slice(-3)}`,
          title,
          meta: 'Today · 0:00 / 30m',
          priority: 'Medium',
        },
      ],
    }))
    setToast('Task added.')
    window.setTimeout(() => setToast(null), 2000)
  }

  const addCalendarEntry = (entry: CalendarEntry) => {
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
    setToast('Calendar item added.')
    window.setTimeout(() => setToast(null), 2000)
  }

  const togglePlan = (index: number) => {
    setPlansBySpace((current) => ({
      ...current,
      [space]: current[space].map((done, itemIndex) => (itemIndex === index ? !done : done)),
    }))
  }

  const addExpense = (record: ExpenseRecord) => {
    setExpensesBySpace((current) => ({
      ...current,
      [space]: [record, ...current[space]],
    }))
    setToast(space === 'office' ? 'Reimbursement submitted.' : 'Expense saved.')
    window.setTimeout(() => setToast(null), 2500)
  }

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopSidebarVisible((visible) => !visible)
    } else {
      setSidebarOpen((visible) => !visible)
    }
  }

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setToast('Notifications are not supported by this browser.')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setToast('Notification permission was not granted.')
      return
    }

    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('Workbench notifications enabled', {
      body: 'Meeting reminders, task alerts, and mentions will appear here.',
      icon: '/icons/workbench-192.png',
      badge: '/icons/workbench-192.png',
      tag: 'workbench-enabled',
    })
    setToast('Popup notifications are enabled.')
    setNotificationsOpen(false)
    window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="workbench-scale flex min-h-screen bg-[#f7f7f8] text-[#17171a]">
      <Sidebar
        workspace={workspace}
        activeNav={activeNav}
        onNavigate={setActiveNav}
        open={sidebarOpen}
        desktopVisible={desktopSidebarVisible}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-none px-4 py-5 md:px-8">
          <header className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="neo-control grid size-9 place-items-center rounded-lg text-[#4d4d55]"
              onClick={toggleSidebar}
              aria-label={desktopSidebarVisible ? 'Hide navigation' : 'Show navigation'}
            >
              <Menu size={18} />
            </button>
            <h2 className="mr-auto text-[22px] font-semibold tracking-[-0.025em]">{pageTitle}</h2>
            <label className="relative hidden w-[180px] md:block xl:w-[228px]">
              <input
                className="h-10 w-full rounded-lg border border-[#d8d8dc] bg-white px-3 text-[14px] outline-none focus:border-[#675ee0]"
                placeholder="Search..."
              />
            </label>
            <WorkspaceSwitcher active={space} onChange={changeSpace} />
            <NotificationCenter
              open={notificationsOpen}
              onToggle={() => setNotificationsOpen((visible) => !visible)}
              onEnable={enableNotifications}
            />
            <span className="grid size-8 place-items-center rounded-full bg-[#eef0ff] text-[11px] font-semibold text-[#2721a6]">
              ME
            </span>
          </header>

          <div className="mt-2 flex md:hidden">
            <label className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96969c]"
                size={15}
              />
              <input
                className="h-10 w-full rounded-lg border border-[#d8d8dc] bg-white pl-9 pr-3 text-[14px] outline-none"
                placeholder="Search..."
              />
            </label>
          </div>

          {activeNav === 'Home' ? (
            <>
              {!dismissed && (
                <section className="mt-[15px] flex flex-wrap items-center gap-2 rounded-lg border border-[#f1d969] bg-[#fff8cf] px-4 py-[7px]">
                  <p className="mr-auto text-[14px] text-[#684a00]">
                    <strong className="font-medium">{workspace.alert}</strong> ·{' '}
                    {workspace.alertMeta}
                  </p>
                  <button
                    type="button"
                    className="h-8 rounded-lg border border-[#d9d9dc] bg-white px-3 text-[13px] text-[#45454a]"
                  >
                    Snooze 10 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="h-8 rounded-lg border border-[#d9d9dc] bg-white px-3 text-[13px] text-[#45454a]"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-lg bg-[#493bd0] px-4 text-[13px] font-medium text-white"
                  >
                    Join
                  </button>
                </section>
              )}

              <div className="mt-[13px] grid gap-4 xl:grid-cols-[333px_minmax(0,1fr)]">
                <TaskList
                  workspace={workspace}
                  tasks={tasks}
                  onToggle={toggleTask}
                  onAdd={addTask}
                />
                <CalendarPanel entries={calendarBySpace[space]} onAdd={addCalendarEntry} />
              </div>

              <div className="mt-[15px]">
                <BottomPanels
                  workspace={workspace}
                  plan={plansBySpace[space]}
                  onTogglePlan={togglePlan}
                />
              </div>
            </>
          ) : (
            <div className="mt-5">
              <WorkspacePage
                activeNav={activeNav}
                workspace={workspace}
                tasks={tasks}
                onToggleTask={toggleTask}
                onAddTask={addTask}
                calendar={calendarBySpace[space]}
                onAddCalendar={addCalendarEntry}
                expenses={expensesBySpace[space]}
                onAddExpense={addExpense}
              />
            </div>
          )}
        </div>
      </main>
      {toast && (
        <div
          className="neo-card fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl px-4 py-3 text-[13px] font-medium text-[#303038]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
