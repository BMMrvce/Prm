import type { CategoryColor, Meeting, MeetingCategoryConfig, SpaceKey } from '@/types/workbench'

/**
 * Meeting categories: people or entities whose meetings get their own color. Meetings have
 * no attendee column, so a meeting belongs to a category when its title (or location) names
 * it: the label or one of its extra keywords, as a whole word. Each workspace sets its own
 * list in Settings → Meeting colors; until then the defaults below apply.
 */

/** Classes per color. Literal strings so Tailwind generates them. */
export const CATEGORY_COLORS: Record<
  CategoryColor,
  { name: string; dot: string; chip: string; border: string; tab: string }
> = {
  blue: {
    name: 'Blue',
    dot: 'bg-cat-blue',
    chip: 'bg-cat-blue-light text-cat-blue-ink',
    border: 'border-cat-blue',
    tab: 'border-cat-blue bg-cat-blue-light text-cat-blue-ink',
  },
  orange: {
    name: 'Orange',
    dot: 'bg-cat-orange',
    chip: 'bg-cat-orange-light text-cat-orange-ink',
    border: 'border-cat-orange',
    tab: 'border-cat-orange bg-cat-orange-light text-cat-orange-ink',
  },
  green: {
    name: 'Green',
    dot: 'bg-cat-green',
    chip: 'bg-cat-green-light text-cat-green-ink',
    border: 'border-cat-green',
    tab: 'border-cat-green bg-cat-green-light text-cat-green-ink',
  },
  violet: {
    name: 'Violet',
    dot: 'bg-cat-violet',
    chip: 'bg-cat-violet-light text-cat-violet-ink',
    border: 'border-cat-violet',
    tab: 'border-cat-violet bg-cat-violet-light text-cat-violet-ink',
  },
  pink: {
    name: 'Pink',
    dot: 'bg-cat-pink',
    chip: 'bg-cat-pink-light text-cat-pink-ink',
    border: 'border-cat-pink',
    tab: 'border-cat-pink bg-cat-pink-light text-cat-pink-ink',
  },
  teal: {
    name: 'Teal',
    dot: 'bg-cat-teal',
    chip: 'bg-cat-teal-light text-cat-teal-ink',
    border: 'border-cat-teal',
    tab: 'border-cat-teal bg-cat-teal-light text-cat-teal-ink',
  },
  amber: {
    name: 'Amber',
    dot: 'bg-cat-amber',
    chip: 'bg-cat-amber-light text-cat-amber-ink',
    border: 'border-cat-amber',
    tab: 'border-cat-amber bg-cat-amber-light text-cat-amber-ink',
  },
  slate: {
    name: 'Slate',
    dot: 'bg-cat-slate',
    chip: 'bg-cat-slate-light text-cat-slate-ink',
    border: 'border-cat-slate',
    tab: 'border-cat-slate bg-cat-slate-light text-cat-slate-ink',
  },
}

export const COLOR_NAMES = Object.keys(CATEGORY_COLORS) as CategoryColor[]

/** Most categories a workspace can have (keeps tabs and markers readable). */
export const MAX_CATEGORIES = 8

/** Used until a workspace saves its own list. */
export const DEFAULT_CATEGORIES: MeetingCategoryConfig[] = [
  { id: 'guru', label: 'Guru', keywords: [], color: 'orange' },
  { id: 'arjun', label: 'Arjun', keywords: [], color: 'blue' },
  { id: 'client', label: 'Client', keywords: ['clients'], color: 'green' },
]

/** A category ready to use: its config plus a matcher and color classes. */
export type MeetingCategory = MeetingCategoryConfig & {
  match: RegExp
} & (typeof CATEGORY_COLORS)[CategoryColor]

/** Styling for every meeting where categories are off (Personal). */
export const DEFAULT_MEETING_STYLE = {
  dot: 'bg-accent',
  chip: 'bg-accent-light text-accent-ink',
  border: 'border-accent',
}

/** Meetings that name no category stay neutral, so only the categories carry color. */
const OTHER_MEETING_STYLE = {
  dot: 'bg-ink-3',
  chip: 'bg-surface-2 text-ink-2',
  border: 'border-line-strong',
}

/** Office and Studio use categories (and the dashboard built around them). */
export function categoriesEnabled(space: SpaceKey) {
  return space === 'office' || space === 'studio'
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whole-word, case-insensitive matcher for the label and keywords. Unicode-aware, so names
 * in any script work; an empty word list matches nothing.
 */
function matcher(words: string[]) {
  const parts = words
    .map((word) => word.trim())
    .filter(Boolean)
    .map(escape)
  if (!parts.length) return /(?!)/
  // No lookbehind (older iOS Safari lacks it): a non-word character or the start stands in.
  // Word characters include marks (\p{M}), so Indic vowel signs never split a name.
  const word = '\\p{L}\\p{M}\\p{N}'
  return new RegExp(`(?:^|[^${word}])(?:${parts.join('|')})(?=$|[^${word}])`, 'iu')
}

/** Saved (or default) configs turned into usable categories. */
export function resolveCategories(saved: MeetingCategoryConfig[] | undefined): MeetingCategory[] {
  return (saved ?? DEFAULT_CATEGORIES).map((config) => ({
    ...config,
    ...CATEGORY_COLORS[config.color in CATEGORY_COLORS ? config.color : 'slate'],
    match: matcher([config.label, ...config.keywords]),
  }))
}

/** The first category the meeting's title or location names, if any. */
export function meetingCategory(
  meeting: Pick<Meeting, 'title' | 'location'>,
  categories: MeetingCategory[],
) {
  const text = `${meeting.title} ${meeting.location ?? ''}`
  return categories.find((category) => category.match.test(text)) ?? null
}

/** Dot / chip / border classes for a meeting; `categories` is null where they are off. */
export function meetingStyle(
  meeting: Pick<Meeting, 'title' | 'location'>,
  categories: MeetingCategory[] | null,
) {
  if (!categories) return DEFAULT_MEETING_STYLE
  return meetingCategory(meeting, categories) ?? OTHER_MEETING_STYLE
}

/** Adds "with <Label>" to a title unless it already names the category. */
export function titleWithCategory(title: string, category: MeetingCategory | undefined) {
  if (!category || category.match.test(title)) return title
  return `${title} with ${category.label}`
}
