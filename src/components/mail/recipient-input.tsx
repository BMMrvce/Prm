'use client'

import { useEffect, useRef, useState } from 'react'
import type { MailContact } from '@/lib/mail/types'
import { useWorkspace } from '@/state/workbench-store'
import type { SpaceKey } from '@/types/workbench'

const MIN_CHARS = 3
const MAX_SUGGESTIONS = 6

/** One request per workspace per page load: collecting contacts reads recent mail. */
const contactCache = new Map<SpaceKey, Promise<MailContact[]>>()

function loadContacts(space: SpaceKey) {
  let pending = contactCache.get(space)
  if (!pending) {
    pending = fetch(`/api/mail/${space}/contacts`)
      .then((response) => response.json() as Promise<{ contacts?: MailContact[] }>)
      .then((data) => data.contacts ?? [])
      .catch(() => [])
    contactCache.set(space, pending)
  }
  return pending
}

/** The address being typed: whatever follows the last comma. */
const currentToken = (value: string) => value.slice(value.lastIndexOf(',') + 1).trimStart()

/**
 * "To" field that suggests people after 3 letters: everyone you have mailed with in this
 * workspace's mailbox, plus ಆyaama users. Picking one completes the current address.
 */
export function RecipientInput({
  space,
  value,
  onChange,
  className,
}: {
  space: SpaceKey
  value: string
  onChange: (value: string) => void
  className: string
}) {
  const { searchPeople } = useWorkspace()
  const [contacts, setContacts] = useState<MailContact[]>([])
  const [people, setPeople] = useState<MailContact[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const token = currentToken(value)
  const query = token.toLowerCase()

  useEffect(() => {
    let cancelled = false
    void loadContacts(space).then((list) => !cancelled && setContacts(list))
    return () => {
      cancelled = true
    }
  }, [space])

  // ಆyaama users by name or email, debounced.
  useEffect(() => {
    if (query.length < MIN_CHARS) {
      setPeople([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchPeople(query)
        if (!cancelled) {
          setPeople(
            found
              .filter((person) => person.email)
              .map((person) => ({ name: person.name, address: person.email! })),
          )
        }
      } catch {
        // Sharing migration not applied: mail contacts still work.
      }
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, searchPeople])

  const chosen = new Set(
    value
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  )
  const seen = new Set<string>()
  const suggestions =
    query.length < MIN_CHARS
      ? []
      : [...contacts, ...people]
          .filter((person) => {
            const address = person.address.toLowerCase()
            if (seen.has(address) || (chosen.has(address) && address !== query)) return false
            seen.add(address)
            return address.includes(query) || person.name.toLowerCase().includes(query)
          })
          .slice(0, MAX_SUGGESTIONS)
  const showList = open && suggestions.length > 0

  const pick = (contact: MailContact) => {
    const before = value.slice(0, value.lastIndexOf(',') + 1)
    onChange(`${before}${before ? ' ' : ''}${contact.address}, `)
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (!showList) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const step = event.key === 'ArrowDown' ? 1 : -1
            setActive((index) => (index + step + suggestions.length) % suggestions.length)
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            pick(suggestions[active])
          } else if (event.key === 'Escape') {
            // Close the list without closing the compose dialog.
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          }
        }}
        className={className}
        placeholder="To: type 3 letters of a name or email"
        aria-label="Recipients"
        aria-autocomplete="list"
        aria-expanded={showList}
        autoComplete="off"
        inputMode="email"
        required
      />
      {showList && (
        <ul
          role="listbox"
          className="animate-pop absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          {suggestions.map((contact, index) => (
            <li key={contact.address} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(contact)}
                onMouseEnter={() => setActive(index)}
                className={`block w-full px-3 py-2 text-left ${index === active ? 'bg-primary-subtle' : ''}`}
              >
                <span className="block truncate text-[13px] font-medium text-ink">
                  {contact.name || contact.address}
                </span>
                {contact.name && contact.name !== contact.address && (
                  <span className="block truncate text-[11px] text-ink-2">{contact.address}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
