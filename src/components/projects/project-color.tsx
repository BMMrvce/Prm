'use client'

import { Check, Pipette } from 'lucide-react'
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
 * Swatches plus a custom color for one project. Only projects in your own workspace can be
 * recolored (the owner's workspace controls shared ones).
 */
export function ProjectColorPicker({ project }: { project: Project }) {
  const { isOwn, setProjectColor } = useWorkspace()
  const own = isOwn(project.workspaceId)
  const current = project.color.toLowerCase()
  const custom = !PROJECT_COLORS.some((color) => color.hex === current)

  if (!own) {
    return (
      <p className="flex items-center gap-2 text-xs text-ink-2">
        <ProjectBadge project={project} size="sm" />
        Color set by {project.sharedBy ?? 'the owner'}.
      </p>
    )
  }

  const pick = (hex: string) => {
    if (hex.toLowerCase() !== current && isHexColor(hex)) void setProjectColor(project.id, hex)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="radiogroup"
      aria-label={`Color for ${project.name}`}
    >
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
            className={`grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface hover:scale-110 ${
              on ? 'ring-2 ring-ink' : ''
            }`}
            style={{ background: color.hex, color: textOn(color.hex) }}
          >
            {on && <Check size={14} strokeWidth={3} />}
          </button>
        )
      })}
      {/* Any other color via the browser's picker; saved when the picker closes. */}
      <label
        className={`relative grid size-7 cursor-pointer place-items-center rounded-full border border-dashed border-line-strong text-ink-2 ring-offset-2 ring-offset-surface hover:text-ink ${
          custom ? 'ring-2 ring-ink' : ''
        }`}
        style={custom ? { background: project.color, color: textOn(project.color) } : undefined}
        title="Custom color"
      >
        {custom ? <Check size={14} strokeWidth={3} /> : <Pipette size={13} />}
        <input
          type="color"
          defaultValue={project.color}
          key={project.color}
          // React's onChange fires on every drag step; save only on the native `change`
          // event, which fires once when the picker closes.
          ref={(input) => {
            if (!input) return
            const save = () => pick(input.value)
            input.addEventListener('change', save)
            return () => input.removeEventListener('change', save)
          }}
          onChange={(event) => {
            // Live preview on the swatch while choosing.
            const swatch = event.currentTarget.parentElement
            if (swatch) swatch.style.background = event.target.value
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Custom color"
        />
      </label>
    </div>
  )
}
