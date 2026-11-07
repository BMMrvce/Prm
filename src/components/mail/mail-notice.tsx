import Link from 'next/link'
import type { MailStatus } from '@/lib/mail/types'
import { workspacePath } from '@/lib/routes'
import type { SpaceKey } from '@/types/workbench'

/** Explains why a mailbox shows no messages: nothing connected, or a server error. */
export function MailNotice({
  space,
  status,
  error,
  compact = false,
}: {
  space: SpaceKey
  status: MailStatus | null
  error: string | null
  compact?: boolean
}) {
  const text = compact ? 'text-2xs' : 'text-sm'
  if (status?.state === 'disconnected') {
    return (
      <div className={`flex flex-col items-center gap-3 py-6 text-center ${text}`}>
        <p className="text-ink-2">
          {status.note ??
            `Connect your ${status.options
              .map((option) => option.label)
              .join(', ')
              .replace(/, ([^,]*)$/, ' or $1')} mailbox to see mail here.`}
        </p>
        <Link
          href={workspacePath(space, 'integrations')}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-on-primary hover:bg-primary-hover"
        >
          Connect a mailbox
        </Link>
      </div>
    )
  }
  if (error) {
    return (
      <p className={`rounded-lg bg-error-light px-3 py-2 text-error-ink ${text}`} role="alert">
        {error}
      </p>
    )
  }
  return null
}
