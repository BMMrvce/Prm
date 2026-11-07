'use client'

import { UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { initials } from '@/lib/format'
import { useWorkspace } from '@/state/workbench-store'
import type { Person } from '@/types/workbench'

/** Chips for tagged people plus a name/email search to tag someone new. */
export function PeoplePicker({
  ids,
  onAdd,
  onRemove,
  canEdit,
  emptyText = 'Nobody tagged yet.',
}: {
  ids: string[]
  onAdd: (person: Person) => Promise<boolean>
  onRemove: (id: string) => void
  canEdit: boolean
  emptyText?: string
}) {
  const { collaboration, personName, searchPeople } = useWorkspace()
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const query = term.trim()
    if (query.length < 3) {
      setResults([])
      setMessage(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const people = await searchPeople(query)
        if (cancelled) return
        setResults(people)
        setMessage(people.length ? null : 'No one found. They need a ಆyaama account first.')
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Search failed.')
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchPeople, term])

  const options = results.filter((person) => !ids.includes(person.id))

  const pick = async (person: Person) => {
    if (await onAdd(person)) {
      setTerm('')
      setResults([])
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {!ids.length && <p className="text-xs text-ink-3">{emptyText}</p>}
        {ids.map((id) => (
          <span
            key={id}
            className="flex max-w-full items-center gap-1.5 rounded-full bg-primary-light py-1 pl-1 pr-2 text-xs text-primary-ink"
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface text-2xs font-semibold">
              {initials(personName(id))}
            </span>
            <span className="truncate">{personName(id)}</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="shrink-0 opacity-60 hover:opacity-100"
                aria-label={`Remove ${personName(id)}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {canEdit && !collaboration && (
        <p className="mt-2 text-xs text-warning-ink">
          Tagging needs a database update: run
          supabase/migrations/202611050002_collaboration_time_income.sql in the Supabase SQL editor.
        </p>
      )}
      {canEdit && collaboration && (
        <div className="relative mt-2">
          <UserPlus
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="h-9 w-full rounded-lg border border-line-strong bg-field pl-8 pr-3 text-xs outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15"
            placeholder="Tag someone by name or email"
            aria-label="Search people to tag"
          />
          {(options.length > 0 || message) && (
            <div className="absolute inset-x-0 top-10 z-20 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
              {message && <p className="px-3 py-2.5 text-xs text-ink-2">{message}</p>}
              {options.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  onClick={() => void pick(person)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-primary-subtle"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-light text-2xs font-semibold text-primary-ink">
                    {initials(person.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{person.name}</span>
                    {person.email && (
                      <span className="block truncate text-2xs text-ink-2">{person.email}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
