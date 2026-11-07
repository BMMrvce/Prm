'use client'

import { Check, ChevronDown, Palette, Pipette } from 'lucide-react'
import { useState } from 'react'
import { isHexColor, PROJECT_COLORS, projectInitial, textOn } from '@/lib/projects'
import { useWorkspace } from '@/state/workbench-store'
import type { Project } from '@/types/workbench'

/**
 * A project's color as a rounded tile with its first letter: easy to tell apart even in
 * the collapsed sidebar. Project colors are user data, hence the inline style.
 */
export function ProjectBadge({
  project,
  size = 'md',
}: {
  project: Pick<Project, 'name' | 'color'>
  size?: 'sm' | 'md' | 'lg'
}) {
  const box =
    size === 'sm'
      ? 'size-[18px] rounded-[5px] text-[10px]'
      : size === 'lg'
        ? 'size-10 rounded-lg text-base'
        : 'size-6 rounded-md text-2xs'
  return (
    <span
      className={`grid shrink-0 place-items-center font-bold leading-none ${box}`}
      style={{ background: project.color, color: textOn(project.color) }}
      aria-hidden
    >
      {projectInitial(project.name)}
    </span>
  )
}

/**
 * One control for a project's color: a single trigger (the project tile, or a swatch) that
 * opens a small picker with the preset colors and a custom color. Only projects in your own
 * workspace can be recolored (the owner's workspace controls shared ones).
 */
export function ProjectColorPicker({
  project,
  trigger = 'swatch',
}: {
  project: Project
  /** `badge`: the large project tile is the button (project page). `swatch`: a color chip. */
  trigger?: 'badge' | 'swatch'
}) {
  const { isOwn, setProjectColor } = useWorkspace()
  const [open, setOpen] = useState(false)
  const own = isOwn(project.workspaceId)
  const current = project.color.toLowerCase()
  const preset = PROJECT_COLORS.find((color) => color.hex === current)

  if (!own) {
    return (
      <span title={`Color set by ${project.sharedBy ?? 'the owner'}`}>
        {trigger === 'badge' ? (
          <ProjectBadge project={project} size="lg" />
        ) : (
          <span
            className="block size-6 rounded-full border border-line-strong"
            style={{ background: project.color }}
          />
        )}
      </span>
    )
  }

  const pick = (hex: string) => {
    if (hex.toLowerCase() !== current && isHexColor(hex)) void setProjectColor(project.id, hex)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Color for ${project.name}: ${preset?.name ?? project.color}. Change`}
        title="Change color"
        className={
          trigger === 'badge'
            ? 'group relative block rounded-lg ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-line-strong'
            : 'flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-field pl-1.5 pr-2 text-ink-2 hover:border-primary/50 hover:text-ink'
        }
      >
        {trigger === 'badge' ? (
          <>
            <ProjectBadge project={project} size="lg" />
            <span className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-sm group-hover:text-ink">
              <Palette size={10} />
            </span>
          </>
        ) : (
          <>
            <span className="size-5 rounded-full" style={{ background: project.color }} />
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close color picker"
          />
          <div
            role="dialog"
            aria-label={`Color for ${project.name}`}
            onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
            className={`neo-popover animate-pop absolute top-full z-30 mt-2 w-[236px] rounded-xl p-3 ${
              trigger === 'badge' ? 'left-0' : 'right-0'
            }`}
          >
            <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">
              Project color
            </p>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Preset colors">
              {PROJECT_COLORS.map((color) => {
                const on = color.hex === current
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    key={color.hex}
                    onClick={() => pick(color.hex)}
                    title={color.name}
                    aria-label={color.name}
                    className={`grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-elevated hover:scale-110 ${
                      on ? 'ring-2 ring-ink' : ''
                    }`}
                    style={{ background: color.hex, color: textOn(color.hex) }}
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
            {/* Any other color via the browser's picker; saved when the picker closes. */}
            <label className="relative mt-3 flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-2.5 text-xs text-ink-2 hover:text-ink">
              <span
                className="grid size-5 place-items-center rounded-full"
                style={{ background: project.color, color: textOn(project.color) }}
              >
                {!preset && <Check size={11} strokeWidth={3} />}
              </span>
              <Pipette size={13} />
              <span className="flex-1">Custom color</span>
              <span className="font-mono uppercase text-ink-3">{project.color}</span>
              <input
                type="color"
                defaultValue={project.color}
                key={project.color}
                // React's onChange fires on every drag step; save only on the native
                // `change` event, which fires once when the picker closes.
                ref={(input) => {
                  if (!input) return
                  const save = () => pick(input.value)
                  input.addEventListener('change', save)
                  return () => input.removeEventListener('change', save)
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Custom color"
              />
            </label>
          </div>
        </>
      )}
    </div>
  )
}
