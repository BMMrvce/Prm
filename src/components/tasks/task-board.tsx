'use client'

import { SquareCheck } from '@/components/ui/square-check'
import { priorityStyle } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'

export function TaskBoard() {
  const { tasks, toggleTask, addTask } = useWorkspace()
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
          addTask(input.value.trim())
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
              onClick={() => toggleTask(task.id)}
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
            <span className={`rounded-full px-2 py-1 text-[10px] ${priorityStyle(task.priority)}`}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
