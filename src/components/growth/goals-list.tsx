'use client'

import { ChevronDown, Flag, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { SquareCheck } from '@/components/ui/square-check'
import { useWorkspace } from '@/state/workbench-store'
import type { Goal, GoalCategory } from '@/types/workbench'
import { GoalFormModal } from './goal-form-modal'
import { MissingMigrationBanner } from './missing-migration-banner'

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  career: 'Career',
  financial: 'Financial',
  personal_development: 'Personal Development',
  learning: 'Learning',
  other: 'Other',
}
const CATEGORY_ORDER: GoalCategory[] = ['career', 'financial', 'personal_development', 'learning', 'other']

function GoalRow({ goal }: { goal: Goal }) {
  const { goalMilestones, updateGoal, addMilestone, toggleMilestone, deleteMilestone } = useWorkspace()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const milestones = goalMilestones
    .filter((item) => item.goalId === goal.id)
    .sort((a, b) => a.position - b.position)
  const completed = milestones.filter((item) => item.completedAt).length
  const progress = milestones.length ? Math.round((completed / milestones.length) * 100) : null

  const addOne = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    if (await addMilestone({ goalId: goal.id, title: text })) setDraft('')
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-2"
          aria-label={expanded ? 'Collapse milestones' : 'Expand milestones'}
          aria-expanded={expanded}
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm ${goal.status === 'completed' ? 'text-ink-3 line-through' : 'text-ink'}`}
          >
            {goal.title}
          </p>
          <p className="truncate text-2xs text-ink-3">
            {goal.targetDate
              ? `Target ${new Date(goal.targetDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'No target date'}
            {progress !== null ? ` · ${completed}/${milestones.length} milestones` : ''}
          </p>
          {progress !== null && (
            <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <select
          value={goal.status}
          onChange={(event) =>
            void updateGoal(goal.id, { status: event.target.value as Goal['status'] })
          }
          className="h-8 shrink-0 rounded-lg border border-line-strong bg-field px-2 text-xs"
        >
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
          aria-label={`Edit ${goal.title}`}
        >
          <Pencil size={13} />
        </button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-1 pl-8">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="group flex items-center gap-2.5">
              <SquareCheck
                checked={Boolean(milestone.completedAt)}
                onClick={() => void toggleMilestone(milestone.id)}
                label={`Complete ${milestone.title}`}
              />
              <span
                className={`min-w-0 flex-1 truncate text-sm ${milestone.completedAt ? 'text-ink-3 line-through' : 'text-ink'}`}
              >
                {milestone.title}
              </span>
              <button
                type="button"
                onClick={() => void deleteMilestone(milestone.id)}
                className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 opacity-0 hover:text-error-ink group-hover:opacity-100"
                aria-label={`Remove ${milestone.title}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <form onSubmit={addOne} className="flex gap-2 pt-1">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a milestone"
              className="h-8 min-w-0 flex-1 rounded-lg border border-line-strong bg-field px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-on-primary hover:bg-primary-hover"
              aria-label="Add milestone"
            >
              <Plus size={13} />
            </button>
          </form>
        </div>
      )}
      {editing && <GoalFormModal goal={goal} onClose={() => setEditing(false)} />}
    </div>
  )
}

/** Personal goals grouped by category, with a milestone checklist driving progress. */
export function GoalsList() {
  const { ready, learningGoalsReady, goals } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const active = goals.filter((goal) => goal.status !== 'abandoned')
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    goals: active.filter((goal) => goal.category === category),
  })).filter((group) => group.goals.length)

  if (ready && !learningGoalsReady) return <MissingMigrationBanner />

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader icon={Flag} title="Goals" subtitle={`${active.length} goal${active.length === 1 ? '' : 's'}`}>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
        >
          Add goal
        </button>
      </PanelHeader>
      {ready && !active.length && (
        <EmptyState icon={Flag} title="No goals yet" hint="Add a goal to start tracking progress." />
      )}
      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{group.label}</h3>
            <div className="mt-1.5 divide-y divide-line-soft">
              {group.goals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {creating && <GoalFormModal goal={null} onClose={() => setCreating(false)} />}
    </section>
  )
}
