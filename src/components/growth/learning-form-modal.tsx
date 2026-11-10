'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { useWorkspace } from '@/state/workbench-store'
import type { LearningCategory, LearningStatus, LearningTopic } from '@/types/workbench'

const CATEGORIES: { value: LearningCategory; label: string }[] = [
  { value: 'system_design', label: 'System Design' },
  { value: 'linux', label: 'Linux' },
  { value: 'aws', label: 'AWS' },
  { value: 'devops', label: 'DevOps' },
  { value: 'software_engineering', label: 'Software Engineering' },
  { value: 'software_architecture', label: 'Software Architecture' },
  { value: 'other', label: 'Other' },
]

/** Add or edit a learning topic: category, 4-state progress, resources and notes. */
export function LearningFormModal({ topic, onClose }: { topic: LearningTopic | null; onClose: () => void }) {
  const { addLearningTopic, updateLearningTopic, deleteLearningTopic } = useWorkspace()
  const [title, setTitle] = useState(topic?.title ?? '')
  const [category, setCategory] = useState<LearningCategory>(topic?.category ?? 'system_design')
  const [status, setStatus] = useState<LearningStatus>(topic?.status ?? 'not_started')
  const [resources, setResources] = useState(topic?.resources ?? '')
  const [notes, setNotes] = useState(topic?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text) return
    setSaving(true)
    const input = {
      title: text,
      category,
      status,
      resources: resources.trim() || null,
      notes: notes.trim() || null,
    }
    const ok = topic ? await updateLearningTopic(topic.id, input) : await addLearningTopic(input)
    setSaving(false)
    if (ok) onClose()
  }

  const remove = async () => {
    if (!topic) return
    setSaving(true)
    const ok = await deleteLearningTopic(topic.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={topic ? 'Edit topic' : 'Add topic'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-1`}
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as LearningCategory)}
              className={`${fieldClass} mt-1`}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Progress</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LearningStatus)}
              className={`${fieldClass} mt-1`}
            >
              <option value="not_started">Not started</option>
              <option value="learning">Learning</option>
              <option value="practised">Practised</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Resources (optional)</label>
          <textarea
            value={resources}
            onChange={(event) => setResources(event.target.value)}
            rows={3}
            placeholder="Links, books, courses..."
            className="mt-1 w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className={labelClass}>Notes & exercises (optional)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          {topic ? (
            <button type="button" onClick={remove} className="text-xs text-error-ink hover:underline">
              Delete topic
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              {topic ? 'Save changes' : 'Add topic'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
