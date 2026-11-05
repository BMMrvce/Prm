'use client'

import { Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { DurationInput } from '@/components/ui/duration-input'
import { SquareCheck } from '@/components/ui/square-check'
import { capitalize, duration, entrySeconds, priorityStyle, shortDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Priority } from '@/types/workbench'
import { TaskDialog } from './task-dialog'

const priorities: Priority[] = ['none', 'low', 'medium', 'high', 'urgent']

/** Task list with a full add form; pass `projectId` to scope it to one project. */
export function TaskBoard({ projectId }: { projectId?: string }) {
  const { ready, tasks: allTasks, projects, timeEntries, toggleTask, addTask } = useWorkspace()
  const [filter, setFilter] = useState<'open' | 'completed'>('open')
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [due, setDue] = useState('')
  const [estimate, setEstimate] = useState<number | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const scoped = projectId ? allTasks.filter((task) => task.projectId === projectId) : allTasks
  const tasks = scoped.filter((task) => task.state === filter)
  const openCount = scoped.filter((task) => task.state === 'open').length
  const loggedMinutes = new Map<string, number>()
  for (const entry of timeEntries) {
    if (entry.taskId) {
      loggedMinutes.set(
        entry.taskId,
        (loggedMinutes.get(entry.taskId) ?? 0) + entrySeconds(entry) / 60,
      )
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    const ok = await addTask({
      title: title.trim(),
      projectId: projectId ?? (project || undefined),
      priority,
      // End of the chosen day, local time.
      dueAt: due ? new Date(`${due}T23:59`).toISOString() : null,
      estimateMinutes: estimate,
    })
    if (ok) {
      setTitle('')
      setDue('')
      setEstimate(null)
      setPriority('none')
    }
  }

  const control =
    'h-10 min-w-0 rounded-lg border border-[#d8d8dc] bg-white px-3 text-sm outline-none focus:border-[#493bd0]'

  return (
    <section className="neo-card min-w-0 overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e4e4e7] px-5 py-4">
        <div className="mr-auto">
          <h3 className="font-semibold">{projectId ? 'Project tasks' : 'All tasks'}</h3>
          <p className="text-xs text-[#73737a]">{openCount} open tasks</p>
        </div>
        <div className="flex rounded-lg bg-[#f2f2f4] p-0.5 text-xs font-medium">
          {(['open', 'completed'] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 capitalize ${filter === value ? 'bg-white shadow-sm' : 'text-[#66666c]'}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-2 border-b border-[#eeeeef] p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_190px_auto]"
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`${control} sm:col-span-2 xl:col-span-1`}
          placeholder="Add a task"
          aria-label="Task title"
        />
        {!projectId && (
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            className={control}
            aria-label="Project"
          >
            <option value="">General</option>
            {projects
              .filter((item) => item.slug !== 'general')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.sharedBy ? ` (${item.sharedBy})` : ''}
                </option>
              ))}
          </select>
        )}
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          className={control}
          aria-label="Priority"
        >
          {priorities.map((value) => (
            <option key={value} value={value}>
              {value === 'none' ? 'No priority' : capitalize(value)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={due}
          onChange={(event) => setDue(event.target.value)}
          className={control}
          aria-label="Due date"
        />
        <DurationInput value={estimate} onChange={setEstimate} label="Estimate" />
        <button
          className="h-10 rounded-lg bg-[#493bd0] px-4 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={!ready}
        >
          Add task
        </button>
      </form>
      {!ready && <p className="px-5 py-8 text-center text-sm text-[#88888e]">Loading tasks…</p>}
      {ready && !tasks.length && (
        <p className="px-5 py-8 text-center text-sm text-[#88888e]">
          {filter === 'open' ? 'No open tasks.' : 'No completed tasks yet.'}
        </p>
      )}
      <div className="divide-y divide-[#eeeeef]">
        {tasks.map((task) => (
          <div
            className="flex w-full items-center gap-3 px-5 py-4 hover:bg-[#fafaff]"
            key={task.id}
          >
            <SquareCheck
              checked={task.state === 'completed'}
              onClick={() => void toggleTask(task.id)}
              label={`Toggle ${task.title}`}
            />
            <button
              type="button"
              onClick={() => setEditing(task.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p
                className={`break-words text-sm font-medium ${task.state === 'completed' ? 'text-[#88888e] line-through' : ''}`}
              >
                {task.title}
              </p>
              <p className="mt-1 truncate text-xs text-[#77777d]">
                {task.code}
                {!projectId && task.projectName && ` · ${task.projectName}`}
                {task.dueAt && ` · Due ${shortDate(task.dueAt)}`}
                {task.estimateMinutes || loggedMinutes.get(task.id)
                  ? ` · ${duration(loggedMinutes.get(task.id) ?? 0)}${task.estimateMinutes ? ` / ${duration(task.estimateMinutes)}` : ''}`
                  : null}
                {task.sharedBy && ` · from ${task.sharedBy}`}
              </p>
            </button>
            {task.assignees.length > 0 && (
              <span
                className="flex shrink-0 items-center gap-1 text-[11px] text-[#66666c]"
                title={`${task.assignees.length} tagged`}
              >
                <Users size={13} /> {task.assignees.length}
              </span>
            )}
            {task.priority !== 'none' && (
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${priorityStyle(task.priority)}`}
              >
                {capitalize(task.priority)}
              </span>
            )}
          </div>
        ))}
      </div>
      {editing && <TaskDialog taskId={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
