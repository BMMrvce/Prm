/** Mail shapes shared by the `/api/mail` route handlers and the client views. */
export type MailFolder = 'inbox' | 'sent'

export type MailProviderKey = 'hostinger' | 'outlook' | 'gmail'

/** A mailbox the user can connect to this workspace; `available` is false when the server lacks its keys. */
export type MailOption = {
  provider: MailProviderKey
  label: string
  available: boolean
  /** Why it is unavailable, e.g. which env vars are missing. */
  note?: string
}

export type MailStatus =
  | { state: 'connected'; provider: MailProviderKey; label: string; account: string }
  | {
      state: 'disconnected'
      options: MailOption[]
      /** Set when a previous connection stopped working. */
      note?: string
    }

export type MailSummary = {
  id: string
  subject: string
  from: string
  fromAddress: string
  to: string
  date: string
  unread: boolean
}

/** A file attached to a received message; download it by `id`. */
export type MailAttachmentInfo = {
  id: string
  filename: string
  contentType: string
  size: number
}

export type MailMessage = MailSummary & {
  html: string | null
  text: string
  /** Files to download (images shown inside the message body are not repeated here). */
  attachments: MailAttachmentInfo[]
}

/** One attachment's bytes, for the download endpoint. */
export type MailAttachmentFile = {
  filename: string
  contentType: string
  content: Buffer
}

/**
 * Filters for listing a folder. `after` / `before` are ISO instants the client computes
 * from local dates, so "Nov 7" means the viewer's Nov 7 whatever the server's timezone.
 */
export type MailQuery = {
  /** Words to find in the sender, recipients, subject or body. */
  search?: string
  /** Only mail received at or after this instant. */
  after?: string
  /** Only mail received before this instant. */
  before?: string
  /** Opaque page token from the previous response's `nextCursor`. */
  cursor?: string
  /** Messages per page (default MAIL_PAGE_SIZE); the dashboard card asks for fewer. */
  limit?: number
}

/** Messages fetched per page; scrolling loads the next page until the folder ends. */
export const MAIL_PAGE_SIZE = 40

export type MailListResponse = {
  status: MailStatus
  messages: MailSummary[]
  /** Pass back as `cursor` for the next page; null when the folder (or search) is done. */
  nextCursor?: string | null
  error?: string
}

/** Someone you have exchanged mail with, for recipient suggestions. */
export type MailContact = { name: string; address: string }

/** A file attached to an outgoing message (server side, after upload). */
export type OutgoingAttachment = {
  filename: string
  contentType: string
  content: Buffer
}

/** Most attachment bytes per message: request bodies over ~4.5 MB are refused by hosts. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024
export const MAX_ATTACHMENTS = 10

export type SendMailInput = {
  to: string
  cc?: string
  subject: string
  /** Plain-text version (always sent, for clients that do not show HTML). */
  body: string
  /** Formatted version from the editor. */
  html?: string
  attachments?: OutgoingAttachment[]
}
