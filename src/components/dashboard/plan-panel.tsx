'use client'

import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SquareCheck } from '@/components/ui/square-check'
import { useWorkspace } from '@/state/workbench-store'

/** Today's plan of action from `plan_items`. */
export function PlanPanel() {
  const { ready, plan, addPlanItem, togglePlanItem, removePlanItem } = useWorkspace()
  const [title, setTitle] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text) return
    if (await addPlanItem(text)) setTitle('')
  }

  return (
    <section className="neo-card flex min-h-[330px] min-w-0 flex-col rounded-xl p-4">
      <h2 className="text-[15px] font-semibold">Plan of Action</h2>
      {ready && !plan.length && (
        <p className="mt-3 text-[13px] text-[#88888e]">Plan your day: add the steps below.</p>
      )}
      <div className="mt-4 flex-1 space-y-4">
        {plan.map((item, index) => (
          <div className="group flex items-center gap-3" key={item.id}>
            <SquareCheck
              checked={Boolean(item.completedAt)}
              onClick={() => void togglePlanItem(item.id)}
              label={`Complete ${item.title}`}
            />
            <span
              className={`min-w-0 flex-1 break-words text-[14px] ${item.completedAt ? 'text-[#77777d] line-through' : ''}`}
            >
              {index + 1}. {item.title}
            </span>
            <button
              type="button"
              onClick={() => void removePlanItem(item.id)}
              className="shrink-0 text-[#a0a0a6] opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove ${item.title}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={!ready}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8d8dc] px-3 text-xs outline-none focus:border-[#493bd0]"
          placeholder="Add a step"
          aria-label="New plan step"
        />
        <button
          type="submit"
          disabled={!ready}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#493bd0] text-white disabled:opacity-60"
          aria-label="Add plan step"
        >
          <Plus size={14} />
        </button>
      </form>
    </section>
  )
}
