'use client'

/** Hours + minutes entry; `value` is total minutes, or null when both boxes are empty. */
export function DurationInput({
  value,
  onChange,
  label,
  disabled,
}: {
  value: number | null
  onChange: (minutes: number | null) => void
  label: string
  disabled?: boolean
}) {
  const hoursPart = value === null ? '' : String(Math.floor(value / 60))
  const minutesPart = value === null ? '' : String(value % 60)
  const set = (hours: string, minutes: string) => {
    if (hours === '' && minutes === '') return onChange(null)
    const total = Math.max(0, Number(hours || 0)) * 60 + Math.max(0, Number(minutes || 0))
    onChange(Number.isFinite(total) ? Math.round(total) : null)
  }
  const box =
    'h-10 w-full min-w-0 rounded-lg border border-line-strong bg-field pl-3 pr-7 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-2'

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
      <div className="relative">
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={hoursPart}
          onChange={(event) => set(event.target.value, minutesPart)}
          className={box}
          placeholder="0"
          aria-label={`${label} hours`}
          disabled={disabled}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-3">
          h
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="59"
          inputMode="numeric"
          value={minutesPart}
          onChange={(event) => set(hoursPart, event.target.value)}
          className={box}
          placeholder="0"
          aria-label={`${label} minutes`}
          disabled={disabled}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-3">
          m
        </span>
      </div>
    </div>
  )
}
