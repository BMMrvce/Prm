'use client'

import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SquareCheck } from '@/components/ui/square-check'
import { priorityStyle } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

export function TaskList() {
  const { workspace, tasks, toggleTask, addTask } = useWorkspace()
  const [newTask, setNewTask] = useState('')
  const remaining = tasks.filter((task) => !task.done).length
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTask.trim()) return
    addTask(newTask.trim())
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
              onClick={() => toggleTask(task.id)}
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
      <form onSubmit={submit} className="mt-3 flex gap-2">
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
