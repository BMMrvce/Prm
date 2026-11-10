'use client'

import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { CATEGORY_COLORS, COLOR_NAMES } from '@/lib/meetings'
import { useWorkspace } from '@/state/workbench-store'
import type {
  CategoryColor,
  Habit,
  HabitCategory,
  HabitFrequency,
  HabitTargetKind,
} from '@/types/workbench'

const CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: 'focus', label: 'Focus & Productivity' },
  { value: 'reading', label: 'Reading' },
  { value: 'technical', label: 'Technical Growth' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial Discipline' },
  { value: 'other', label: 'Other' },
]

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Create or edit a habit: title, category, frequency and what it tracks. */
export function HabitFormModal({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { addHabit, updateHabit } = useWorkspace()
  const [title, setTitle] = useState(habit?.title ?? '')
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? 'focus')
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? 'daily')
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? [1, 2, 3, 4, 5])
  const [targetPerWeek, setTargetPerWeek] = useState(habit?.targetPerWeek ?? 3)
  const [targetKind, setTargetKind] = useState<HabitTargetKind>(habit?.targetKind ?? 'boolean')
  const [targetValue, setTargetValue] = useState(habit?.targetValue ?? 0)
  const [targetUnit, setTargetUnit] = useState(habit?.targetUnit ?? '')
  const [color, setColor] = useState<CategoryColor>(habit?.color ?? 'blue')
  const [saving, setSaving] = useState(false)

  const toggleWeekday = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    )

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text) return
    setSaving(true)
    const input = {
      title: text,
      category,
      frequency,
      weekdays: frequency === 'weekdays' ? weekdays : null,
      targetPerWeek: frequency === 'weekly' ? targetPerWeek : null,
      targetKind,
      targetValue: targetKind === 'boolean' ? null : targetValue || null,
      targetUnit: targetKind === 'boolean' ? null : targetUnit || null,
      color,
    }
    const ok = habit ? await updateHabit(habit.id, input) : await addHabit(input)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={habit ? 'Edit habit' : 'Add habit'} onClose={onClose}>
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
              onChange={(event) => setCategory(event.target.value as HabitCategory)}
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
            <label className={labelClass}>Color</label>
            <select
              value={color}
              onChange={(event) => setColor(event.target.value as CategoryColor)}
              className={`${fieldClass} mt-1`}
            >
              {COLOR_NAMES.map((name) => (
                <option key={name} value={name}>
                  {CATEGORY_COLORS[name].name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Frequency</label>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as HabitFrequency)}
            className={`${fieldClass} mt-1`}
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Specific days</option>
            <option value="weekly">A number of times a week</option>
          </select>
        </div>
        {frequency === 'weekdays' && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  weekdays.includes(day)
                    ? 'border-primary bg-primary-light text-primary-ink'
                    : 'border-line-strong text-ink-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {frequency === 'weekly' && (
          <div>
            <label className={labelClass}>Times per week</label>
            <input
              type="number"
              min={1}
              max={7}
              value={targetPerWeek}
              onChange={(event) => setTargetPerWeek(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>Track</label>
          <select
            value={targetKind}
            onChange={(event) => setTargetKind(event.target.value as HabitTargetKind)}
            className={`${fieldClass} mt-1`}
          >
            <option value="boolean">Just done / not done</option>
            <option value="duration">A duration</option>
            <option value="quantity">A quantity</option>
          </select>
        </div>
        {targetKind !== 'boolean' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Target</label>
              <input
                type="number"
                min={0}
                value={targetValue}
                onChange={(event) => setTargetValue(Number(event.target.value))}
                className={`${fieldClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <input
                value={targetUnit}
                onChange={(event) => setTargetUnit(event.target.value)}
                placeholder={targetKind === 'duration' ? 'minutes' : 'pages, reps...'}
                className={`${fieldClass} mt-1`}
              />
            </div>
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
            {habit ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
