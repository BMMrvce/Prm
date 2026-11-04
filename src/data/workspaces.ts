import type { ExpenseRecord, SpaceKey, WorkspaceData } from '@/types/workbench'

export const spaces: Record<SpaceKey, WorkspaceData> = {
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

export const SPACE_KEYS = Object.keys(spaces) as SpaceKey[]

export function isSpaceKey(value: string): value is SpaceKey {
  return Object.hasOwn(spaces, value)
}

export function findWorkspace(key: string): WorkspaceData | undefined {
  return isSpaceKey(key) ? spaces[key] : undefined
}

export const starterExpenses: Record<SpaceKey, ExpenseRecord[]> = {
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
