'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { localDate } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { FocusSession } from '@/types/workbench'

/**
 * Logs (or edits) a deep-work session: duration, distractions, tasks done and a self-rating.
 * `offerTimeLog` (only for a fresh, timer-completed session) adds an optional step to also
 * log the same duration in Time Management against a task.
 */
export function FocusSessionForm({
  session,
  offerTimeLog = false,
  defaultDurationMinutes,
  defaultNote,
  onClose,
}: {
  session?: FocusSession | null
  offerTimeLog?: boolean
  /** Prefills a new (non-edit) session, e.g. with a timer's elapsed minutes. */
  defaultDurationMinutes?: number
  defaultNote?: string | null
  onClose: () => void
}) {
  const { addFocusSession, updateFocusSession, tasks, logTime } = useWorkspace()
  const [date, setDate] = useState(session?.date ?? localDate())
  const [durationMinutes, setDurationMinutes] = useState(session?.durationMinutes ?? defaultDurationMinutes ?? 45)
  const [distractionCount, setDistractionCount] = useState(session?.distractionCount ?? 0)
  const [tasksCompleted, setTasksCompleted] = useState(session?.tasksCompleted ?? 0)
  const [concentrationRating, setConcentrationRating] = useState(session?.concentrationRating ?? 3)
  const [note, setNote] = useState(session?.note ?? defaultNote ?? '')
  const [alsoLogTime, setAlsoLogTime] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [saving, setSaving] = useState(false)
  const openTasks = tasks.filter((task) => task.state === 'open')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!durationMinutes) return
    setSaving(true)
    const input = {
      durationMinutes,
      distractionCount,
      tasksCompleted,
      concentrationRating,
      note: note.trim() || null,
    }
    const ok = session ? await updateFocusSession(session.id, input) : await addFocusSession({ date, ...input })
    if (ok && !session && alsoLogTime && taskId) {
      await logTime({ taskId, date, minutes: durationMinutes })
    }
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={session ? 'Edit focus session' : 'Log a deep work session'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={Boolean(session)}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass}>Duration (minutes)</label>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Distractions</label>
            <input
              type="number"
              min={0}
              value={distractionCount}
              onChange={(event) => setDistractionCount(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass}>Tasks completed</label>
            <input
              type="number"
              min={0}
              value={tasksCompleted}
              onChange={(event) => setTasksCompleted(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Concentration (1–5)</label>
          <div className="mt-1.5 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setConcentrationRating(value)}
                className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-sm font-medium ${
                  concentrationRating === value
                    ? 'border-primary bg-primary-light text-primary-ink'
                    : 'border-line-strong text-ink-2'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="mt-1 text-2xs text-ink-3">A self-rating, not a medical or clinical assessment.</p>
        </div>
        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="What helped or hurt your focus today?"
          />
        </div>
        {offerTimeLog && !session && openTasks.length > 0 && (
          <div className="rounded-lg border border-line-soft p-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={alsoLogTime}
                onChange={(event) => setAlsoLogTime(event.target.checked)}
                className="size-4 rounded border-line-strong"
              />
              Also log this as time against a task
            </label>
            {alsoLogTime && (
              <select
                value={taskId}
                onChange={(event) => setTaskId(event.target.value)}
                className={`${fieldClass} mt-2`}
              >
                <option value="">Choose a task…</option>
                {openTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.code} · {task.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            Save session
          </button>
        </div>
      </form>
    </Modal>
  )
}
