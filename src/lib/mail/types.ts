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

export type MailMessage = MailSummary & {
  html: string | null
  text: string
}

export type MailListResponse = {
  status: MailStatus
  messages: MailSummary[]
  error?: string
}

/** Someone you have exchanged mail with, for recipient suggestions. */
export type MailContact = { name: string; address: string }

export type SendMailInput = {
  to: string
  subject: string
  body: string
}
