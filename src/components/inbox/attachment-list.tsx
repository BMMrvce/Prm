'use client'

import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
  type LucideIcon,
} from 'lucide-react'
import type { MailAttachmentInfo, MailFolder } from '@/lib/mail/types'
import type { SpaceKey } from '@/types/workbench'

function iconFor(type: string, name: string): LucideIcon {
  if (type.startsWith('image/')) return FileImage
  if (type.startsWith('video/')) return FileVideo
  if (/zip|compressed|tar|rar|7z/.test(type) || /\.(zip|rar|7z|gz)$/i.test(name)) return FileArchive
  if (/sheet|excel|csv/.test(type) || /\.(xlsx?|csv)$/i.test(name)) return FileSpreadsheet
  if (/pdf|word|document|text/.test(type) || /\.(pdf|docx?|txt)$/i.test(name)) return FileText
  return File
}

function size(bytes: number) {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** The files attached to an open message, each downloaded from the mail server on click. */
export function AttachmentList({
  space,
  folder,
  messageId,
  attachments,
}: {
  space: SpaceKey
  folder: MailFolder
  messageId: string
  attachments: MailAttachmentInfo[]
}) {
  if (!attachments.length) return null
  const href = (attachment: MailAttachmentInfo) =>
    `/api/mail/${space}/attachment?${new URLSearchParams({ folder, id: messageId, att: attachment.id })}`
  const total = attachments.reduce((sum, item) => sum + item.size, 0)

  return (
    <div className="border-b border-line px-4 py-3 sm:px-5">
      <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">
        <Paperclip size={12} />
        {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
        {total > 0 && <span className="font-medium normal-case text-ink-3">· {size(total)}</span>}
        {attachments.length > 1 && (
          <button
            type="button"
            onClick={() => {
              // One download per file, staggered so browsers allow them all.
              attachments.forEach((attachment, index) =>
                window.setTimeout(() => {
                  const link = document.createElement('a')
                  link.href = href(attachment)
                  link.download = attachment.filename
                  link.click()
                }, index * 400),
              )
            }}
            className="ml-auto text-2xs font-semibold normal-case tracking-normal text-primary-ink hover:underline"
          >
            Download all
          </button>
        )}
      </p>
      <ul className="flex flex-wrap gap-2">
        {attachments.map((attachment) => {
          const Icon = iconFor(attachment.contentType, attachment.filename)
          return (
            <li key={attachment.id} className="animate-row min-w-0 max-w-full">
              <a
                href={href(attachment)}
                download={attachment.filename}
                className="group flex min-w-0 max-w-[280px] items-center gap-2.5 rounded-lg border border-line bg-surface-2 py-2 pl-2.5 pr-3 hover:border-primary/50 hover:bg-primary-subtle"
                title={`Download ${attachment.filename}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface text-primary-ink">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">
                    {attachment.filename}
                  </span>
                  <span className="block text-2xs text-ink-3">
                    {size(attachment.size) || 'File'}
                  </span>
                </span>
                <Download size={14} className="shrink-0 text-ink-3 group-hover:text-primary-ink" />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
