import type { ParsedMail } from 'mailparser'
import type { MailAttachmentFile, MailAttachmentInfo } from './types'

/** Images shown inside the body are embedded as data: URIs up to these sizes. */
const MAX_INLINE_IMAGE = 2 * 1024 * 1024
const MAX_INLINE_TOTAL = 6 * 1024 * 1024

const cleanCid = (value?: string) => (value ?? '').replace(/^<|>$/g, '').trim()

/**
 * From a parsed message (Gmail raw / IMAP source): the HTML with `cid:` images embedded so
 * they display, and the remaining files as downloadable attachments. Attachment ids are the
 * index in `parsed.attachments`, so the download endpoint can find them again.
 */
export function attachmentsOf(parsed: ParsedMail): {
  html: string | null
  attachments: MailAttachmentInfo[]
} {
  let html = parsed.html || null
  let embedded = 0
  const shownInline = new Set<number>()
  parsed.attachments.forEach((file, index) => {
    const cid = cleanCid(file.cid || file.contentId)
    if (!html || !cid || !file.contentType.startsWith('image/')) return
    const reference = new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi')
    if (!reference.test(html)) return
    if (file.size > MAX_INLINE_IMAGE || embedded + file.size > MAX_INLINE_TOTAL) return
    embedded += file.size
    html = html.replace(
      reference,
      `data:${file.contentType};base64,${file.content.toString('base64')}`,
    )
    shownInline.add(index)
  })
  return {
    html,
    attachments: parsed.attachments
      .map((file, index) => ({ file, index }))
      .filter(({ index }) => !shownInline.has(index))
      .map(({ file, index }) => ({
        id: String(index),
        filename: file.filename || `attachment-${index + 1}`,
        contentType: file.contentType || 'application/octet-stream',
        size: file.size ?? file.content.length,
      })),
  }
}

/** The bytes of attachment `id` (its index) in a parsed message. */
export function pickAttachment(parsed: ParsedMail, id: string): MailAttachmentFile | null {
  const file = parsed.attachments[Number(id)]
  if (!/^\d+$/.test(id) || !file) return null
  return {
    filename: file.filename || `attachment-${Number(id) + 1}`,
    contentType: file.contentType || 'application/octet-stream',
    content: file.content,
  }
}
