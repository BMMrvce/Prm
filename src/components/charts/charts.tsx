/**
 * Small dependency-free charts. Colors come from a validated two-slot categorical
 * palette (blue, orange); text always uses ink colors, never the series color.
 */

export const SERIES = ['#2a78d6', '#eb6834'] as const

export type Series = { name: string; color: string }

/** Rounds up to a clean axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(value: number) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((n) => n * power >= value) ?? 10
  return step * power
}

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#55555c]">
      {series.map((item) => (
        <span key={item.name} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  )
}

/**
 * Columns over a shared baseline, one group per label and one column per series.
 * Hovering or focusing a group shows every series' value for it.
 */
export function ColumnChart({
  data,
  series,
  format,
  axisFormat = format,
  height = 180,
  labelEvery = 1,
}: {
  data: { label: string; detail?: string; values: number[] }[]
  series: Series[]
  /** Formats values in the tooltip (and the axis unless `axisFormat` is given). */
  format: (value: number) => string
  axisFormat?: (value: number) => string
  height?: number
  /** Show every Nth x label when columns are dense. */
  labelEvery?: number
}) {
  const max = niceMax(Math.max(0, ...data.flatMap((item) => item.values)))
  const ticks = [max, max / 2, 0]

  return (
    <div className="flex min-w-0 gap-2">
      <div
        className="flex shrink-0 flex-col justify-between text-right text-[10px] leading-none text-[#88888e]"
        style={{ height }}
        aria-hidden
      >
        {ticks.map((tick) => (
          <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {axisFormat(tick)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((tick, index) => (
            <div
              key={tick}
              className={`absolute inset-x-0 border-t ${index === ticks.length - 1 ? 'border-[#c9c9cf]' : 'border-[#ececf0]'}`}
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((item, index) => {
              const align =
                index < data.length / 3
                  ? 'left-0'
                  : index > (data.length * 2) / 3
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2'
              return (
                <div
                  key={`${index}:${item.label}`}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] outline-none hover:bg-[#f4f4f8] focus-visible:bg-[#f4f4f8]"
                  tabIndex={0}
                  aria-label={`${item.detail ?? item.label}: ${series
                    .map((entry, slot) => `${entry.name} ${format(item.values[slot] ?? 0)}`)
                    .join(', ')}`}
                >
                  {series.map((entry, slot) => {
                    const value = item.values[slot] ?? 0
                    return (
                      <div
                        key={entry.name}
                        className="rounded-t-[4px]"
                        style={{
                          width: `min(24px, ${70 / series.length}%)`,
                          height: value > 0 ? `max(2px, ${(value / max) * 100}%)` : 0,
                          background: entry.color,
                        }}
                      />
                    )
                  })}
                  <div
                    className={`pointer-events-none absolute top-0 z-10 hidden w-max max-w-[180px] rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-[11px] shadow-md group-hover:block group-focus-visible:block ${align}`}
                  >
                    <p className="text-[#73737a]">{item.detail ?? item.label}</p>
                    {series.map((entry, slot) => (
                      <p key={entry.name} className="flex items-center gap-1.5">
                        <span className="h-0.5 w-2.5" style={{ background: entry.color }} />
                        <strong className="font-semibold text-[#222226]">
                          {format(item.values[slot] ?? 0)}
                        </strong>
                        {series.length > 1 && <span className="text-[#73737a]">{entry.name}</span>}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-1.5 flex" aria-hidden>
          {data.map((item, index) => (
            <span
              key={`${index}:${item.label}`}
              className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-[#88888e]"
            >
              {index % labelEvery === 0 ? item.label : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Horizontal bars, one row per item, each row holding one bar per series with its
 * value at the tip. Labels sit above the bars so long names never squeeze them.
 */
export function BarRows({
  rows,
  series,
  format,
}: {
  rows: { label: string; values: number[] }[]
  series: Series[]
  format: (value: number) => string
}) {
  const max = Math.max(0, ...rows.flatMap((row) => row.values)) || 1
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label} className="min-w-0">
          <p className="truncate text-xs text-[#36363a]">{row.label}</p>
          <div className="mt-1 space-y-[2px]">
            {series.map((entry, slot) => {
              const value = row.values[slot] ?? 0
              return (
                <div
                  key={entry.name}
                  className="flex items-center gap-1.5"
                  title={`${entry.name}: ${format(value)}`}
                >
                  <div
                    className="h-2.5 shrink-0 rounded-r-[4px]"
                    style={{
                      width: value > 0 ? `max(2px, calc((100% - 4rem) * ${value / max}))` : 0,
                      background: entry.color,
                    }}
                  />
                  <span className="shrink-0 text-[11px] tabular-nums text-[#55555c]">
                    {format(value)}
                  </span>
                </div>
              )
            })}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Label · value · optional note, for headline numbers above the charts. */
export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="neo-card min-w-0 rounded-xl p-4">
      <p className="text-xs text-[#73737a]">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
      {note && <p className="mt-0.5 truncate text-[11px] text-[#88888e]">{note}</p>}
    </div>
  )
}
