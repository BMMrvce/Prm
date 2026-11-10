'use client'

import { Plus, Route, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { SquareCheck } from '@/components/ui/square-check'
import { useWorkspace } from '@/state/workbench-store'

/** Today's plan of action from `plan_items`. */
export function PlanPanel({ bare = false }: { bare?: boolean } = {}) {
  const { ready, plan, addPlanItem, togglePlanItem, removePlanItem } = useWorkspace()
  const [title, setTitle] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text) return
    if (await addPlanItem(text)) setTitle('')
  }

  return (
    <section className={bare ? 'flex min-w-0 flex-col' : 'neo-card flex min-w-0 flex-col rounded-xl p-4 sm:p-5'}>
      {!bare && (
        <PanelHeader
          icon={Route}
          title="Plan of Action"
          subtitle={
            plan.length
              ? `${plan.filter((item) => item.completedAt).length} of ${plan.length} steps done`
              : "Today's steps"
          }
        />
      )}
      {plan.length > 0 && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Plan progress"
          aria-valuemin={0}
          aria-valuemax={plan.length}
          aria-valuenow={plan.filter((item) => item.completedAt).length}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{
              width: `${(plan.filter((item) => item.completedAt).length / plan.length) * 100}%`,
            }}
          />
        </div>
      )}
      {ready && !plan.length && (
        <EmptyState icon={Route} title="No plan for today" hint="Add the steps below." />
      )}
      <div className="mt-3 flex-1 space-y-0.5">
        {plan.map((item, index) => (
          <div
            className="animate-row group flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-surface-2"
            key={item.id}
          >
            <SquareCheck
              checked={Boolean(item.completedAt)}
              onClick={() => void togglePlanItem(item.id)}
              label={`Complete ${item.title}`}
            />
            <span
              className={`min-w-0 flex-1 break-words text-sm ${item.completedAt ? 'text-ink-3 line-through' : 'text-ink'}`}
            >
              <span className="mr-1.5 tabular-nums text-ink-3">{index + 1}.</span>
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => void removePlanItem(item.id)}
              className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 opacity-0 hover:text-error-ink group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
              aria-label={`Remove ${item.title}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-auto flex gap-2 pt-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={!ready}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Add a step"
          aria-label="New plan step"
        />
        <button
          type="submit"
          disabled={!ready}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-on-primary disabled:opacity-60 hover:bg-primary-hover active:bg-primary-active"
          aria-label="Add plan step"
        >
          <Plus size={14} />
        </button>
      </form>
    </section>
  )
}
