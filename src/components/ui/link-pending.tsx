'use client'

import { useLinkStatus } from 'next/link'

/**
 * Small pulsing dot shown inside a <Link> while its page is loading. Always rendered (only
 * its opacity changes) so nothing shifts. Must be a descendant of the Link.
 */
export function LinkPending({ className = '' }: { className?: string }) {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={`size-1.5 shrink-0 rounded-full bg-current transition-opacity duration-150 ${
        pending ? 'animate-pulse opacity-70' : 'opacity-0'
      } ${className}`}
    />
  )
}
