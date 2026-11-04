'use client'

import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useWorkspace } from '@/state/workbench-store'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function CalendarPanel() {
  const { calendar: entries, addCalendarEntry } = useWorkspace()
  const [range, setRange] = useState<'Day' | 'Week'>('Week')
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('Mon')
  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    const existing = entries.find((entry) => entry.day === day)
    addCalendarEntry({
      day,
      date: existing?.date ?? '2',
      meeting: title.trim(),
      task: existing?.task ?? 'Open schedule',
    })
    setTitle('')
    setShowAdd(false)
  }
  return (
    <section className="neo-card min-h-[437px] overflow-hidden rounded-xl p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Calendar view</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdd((visible) => !visible)}
            className="grid size-9 place-items-center rounded-lg border border-[#d8d8dc] bg-white text-[#493bd0]"
            aria-label="Add calendar item"
          >
            <Plus size={15} />
          </button>
          {(['Day', 'Week'] as const).map((item) => (
            <button
              type="button"
              onClick={() => setRange(item)}
              key={item}
              className={`h-9 rounded-lg border px-4 text-[14px] ${
                range === item
                  ? 'border-[#4638ca] bg-[#4638ca] text-white'
                  : 'border-[#d8d8dc] bg-white text-[#333338]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {showAdd && (
        <form onSubmit={addEvent} className="mb-3 grid grid-cols-[90px_minmax(0,1fr)_auto] gap-2">
          <select
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="h-9 rounded-lg border border-[#d8d8dc] bg-white px-2 text-xs"
            aria-label="Calendar day"
          >
            {weekdays.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-9 min-w-0 rounded-lg border border-[#d8d8dc] px-3 text-xs outline-none focus:border-[#493bd0]"
            placeholder="Meeting or event title"
            aria-label="Calendar item title"
          />
          <button
            className="h-9 rounded-lg bg-[#493bd0] px-3 text-xs font-medium text-white"
            type="submit"
          >
            Add
          </button>
        </form>
      )}
      <div
        className={`grid min-h-[361px] gap-2 ${
          range === 'Week'
            ? 'grid-cols-2 md:grid-cols-[196px_179px_161px_200px_196px] md:gap-2.5'
            : 'grid-cols-1'
        }`}
      >
        {(range === 'Week' ? entries : entries.slice(0, 1)).map((day, index) => (
          <div className="neo-inset rounded-lg p-2.5" key={`${day.day}-${index}`}>
            <p className="text-[13px] text-[#616168]">
              {day.day} {day.date}
            </p>
            <div className="mt-2 truncate rounded-full bg-[#fff4c8] px-2 py-1 text-[11px] text-[#7d5b00]">
              Meeting · {day.meeting}
            </div>
            <div
              className={`mt-2 truncate rounded-full px-2 py-1 text-[11px] ${day.taskTone === 'green' ? 'bg-[#e4f8e8] text-[#2f7045]' : 'bg-[#eeedff] text-[#3e34ad]'}`}
            >
              Task · {day.task}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
