/**
 * Project colors. A project's color is a hex string stored in `projects.color` (the column
 * only accepts `#rrggbb`); it marks the project in the sidebar, cards and task rows. These
 * swatches are mid-tones that read on both the light lavender and the dark charcoal sidebar.
 */
export const PROJECT_COLORS: { hex: string; name: string }[] = [
  { hex: '#5b4fd6', name: 'Indigo' },
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#0891b2', name: 'Cyan' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#16a34a', name: 'Green' },
  { hex: '#65a30d', name: 'Lime' },
  { hex: '#ca8a04', name: 'Amber' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#db2777', name: 'Pink' },
  { hex: '#9333ea', name: 'Purple' },
  { hex: '#64748b', name: 'Slate' },
]

/** The database default every project had before colors could be picked. */
export const LEGACY_DEFAULT_COLOR = '#4338ca'

export const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value)

/** The first palette color no existing project uses (cycling once all are taken). */
export function nextProjectColor(used: string[]) {
  const taken = new Set(used.map((hex) => hex.toLowerCase()))
  return (
    PROJECT_COLORS.find((color) => !taken.has(color.hex))?.hex ??
    PROJECT_COLORS[used.length % PROJECT_COLORS.length].hex
  )
}

/** Black or white, whichever reads better on the given background color. */
export function textOn(hex: string) {
  if (!isHexColor(hex)) return '#ffffff'
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  // Contrast against white vs. against near-black; pick the larger.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#ffffff' : '#111111'
}

/** First letter (or digit) of a project name, for the collapsed sidebar tile. */
export function projectInitial(name: string) {
  return (name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '•').toUpperCase()
}
