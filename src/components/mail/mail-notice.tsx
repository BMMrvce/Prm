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
  const text = compact ? 'text-[11px]' : 'text-sm'
  if (status?.state === 'disconnected') {
    return (
      <div className={`flex flex-col items-center gap-3 py-6 text-center ${text}`}>
        <p className="text-[#55555c]">
          {status.note ??
            `Connect your ${status.options
              .map((option) => option.label)
              .join(', ')
              .replace(/, ([^,]*)$/, ' or $1')} mailbox to see mail here.`}
        </p>
        <Link
          href={workspacePath(space, 'integrations')}
          className="rounded-lg bg-[#493bd0] px-4 py-2 text-xs font-medium text-white hover:bg-[#382bb9]"
        >
          Connect a mailbox
        </Link>
      </div>
    )
  }
  if (error) {
    return (
      <p className={`rounded-lg bg-[#fde8e8] px-3 py-2 text-[#a52828] ${text}`} role="alert">
        {error}
      </p>
    )
  }
  return null
}
