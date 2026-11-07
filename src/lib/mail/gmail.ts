import { simpleParser, type AddressObject } from 'mailparser'
import MailComposer from 'nodemailer/lib/mail-composer'
import {
  oauthSession,
  ReconnectRequired,
  saveConnection,
  type OAuthSecret,
  type TokenGrant,
} from '@/lib/connections'
import { googleFetch, refreshGoogleToken } from '@/lib/google'
import { attachmentsOf, pickAttachment } from './attachments'
import type { SpaceKey } from '@/types/workbench'
import {
  MAIL_PAGE_SIZE,
  type MailAttachmentFile,
  type MailContact,
  type MailFolder,
  type MailMessage,
  type MailQuery,
  type MailSummary,
  type SendMailInput,
} from './types'

/** Gmail mailboxes via the Gmail API, signed in with the shared Google OAuth client. */
const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

type GmailHeader = { name: string; value: string }

type GmailMessage = {
  id: string
  labelIds?: string[]
  internalDate?: string
  payload?: { headers?: GmailHeader[] }
  raw?: string
}

async function gmail<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await googleFetch(`${API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (response.status === 401) throw new ReconnectRequired()
  const data = (await response.json().catch(() => null)) as T & { error?: { message?: string } }
  if (!response.ok) throw new Error(data?.error?.message || `Gmail returned ${response.status}`)
  return data
}

/** Saves the Gmail account signed in through the Google callback as this user's mail for `space`. */
export async function connectGmail(userId: string, space: SpaceKey, grant: TokenGrant) {
  const profile = await gmail<{ emailAddress?: string }>(grant.access_token, 'profile')
  await saveConnection(userId, `mail:${space}`, {
    provider: 'gmail',
    account: profile.emailAddress || 'Gmail account',
    secret: {
      accessToken: grant.access_token,
      refreshToken: grant.refresh_token ?? '',
      expiresAt: Date.now() + grant.expires_in * 1000,
    } satisfies OAuthSecret,
  })
}

/** A current Gmail access token for this user's mailbox in `space`. */
export async function gmailToken(userId: string, space: SpaceKey) {
  return (await oauthSession<OAuthSecret>(userId, `mail:${space}`, refreshGoogleToken)).token
}

/** `"Ada Lovelace" <ada@example.com>` → name and address. */
function parseAddress(value: string) {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  return match
    ? { name: match[1].trim(), address: match[2].trim() }
    : { name: '', address: value.trim() }
}

function toSummary(message: GmailMessage): MailSummary {
  const header = (name: string) =>
    message.payload?.headers?.find((item) => item.name.toLowerCase() === name)?.value ?? ''
  const sender = parseAddress(header('from'))
  return {
    id: message.id,
    subject: header('subject') || '(no subject)',
    from: sender.name || sender.address || 'Unknown sender',
    fromAddress: sender.address,
    to: header('to')
      .split(',')
      .map((item) => {
        const address = parseAddress(item)
        return address.name || address.address
      })
      .filter(Boolean)
      .join(', '),
    date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : '',
    unread: Boolean(message.labelIds?.includes('UNREAD')),
  }
}

/** Gmail search text: the words plus exact time bounds (`after:`/`before:` take epoch seconds). */
function gmailQuery({ search, after, before }: MailQuery) {
  const epoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
  return [
    search?.trim(),
    after && !Number.isNaN(Date.parse(after)) ? `after:${epoch(after)}` : '',
    before && !Number.isNaN(Date.parse(before)) ? `before:${epoch(before)}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** One page of a folder (optionally searched), newest first, with the next page's token. */
export async function listGmail(
  token: string,
  folder: MailFolder,
  query: MailQuery = {},
  limit = query.limit ?? MAIL_PAGE_SIZE,
): Promise<{ messages: MailSummary[]; nextCursor: string | null }> {
  const params = new URLSearchParams({
    labelIds: folder === 'inbox' ? 'INBOX' : 'SENT',
    fields: 'messages/id,nextPageToken',
    maxResults: String(limit),
  })
  const q = gmailQuery(query)
  if (q) params.set('q', q)
  if (query.cursor) params.set('pageToken', query.cursor)
  const list = await gmail<{ messages?: { id: string }[]; nextPageToken?: string }>(
    token,
    `messages?${params}`,
  )
  // Only the parts the list shows, to keep each of these parallel requests small.
  const headers = ['From', 'To', 'Subject'].map((name) => `metadataHeaders=${name}`).join('&')
  const fields = 'fields=id,labelIds,internalDate,payload/headers'
  const messages = await Promise.all(
    (list.messages ?? []).map((item) =>
      gmail<GmailMessage>(token, `messages/${item.id}?format=metadata&${headers}&${fields}`),
    ),
  )
  return {
    messages: messages.map(toSummary).sort((a, b) => b.date.localeCompare(a.date)),
    nextCursor: list.nextPageToken ?? null,
  }
}

function addresses(value?: AddressObject | AddressObject[]) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list.flatMap((item) => item.value)
}

export async function markReadGmail(token: string, id: string) {
  await gmail(token, `messages/${encodeURIComponent(id)}/modify`, {
    method: 'POST',
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  })
}

/** One message with its body; `markRead: false` only peeks (for prefetching). */
export async function readGmail(
  token: string,
  id: string,
  markRead = true,
): Promise<MailMessage | null> {
  const message = await gmail<GmailMessage>(token, `messages/${encodeURIComponent(id)}?format=raw`)
  if (!message.raw) return null
  if (markRead && message.labelIds?.includes('UNREAD')) {
    await markReadGmail(token, id).catch(() => {})
  }
  const parsed = await simpleParser(Buffer.from(message.raw, 'base64url'))
  const sender = addresses(parsed.from)[0]
  const { html, attachments } = attachmentsOf(parsed)
  return {
    id: message.id,
    subject: parsed.subject || '(no subject)',
    from: sender?.name || sender?.address || 'Unknown sender',
    fromAddress: sender?.address ?? '',
    to: addresses(parsed.to)
      .map((item) => item.name || item.address)
      .join(', '),
    date: (parsed.date ?? new Date(Number(message.internalDate ?? 0))).toISOString(),
    unread: false,
    html,
    text: parsed.text ?? '',
    attachments,
  }
}

/** One attachment of a message, by its index in the parsed message. */
export async function attachmentGmail(
  token: string,
  id: string,
  attachmentId: string,
): Promise<MailAttachmentFile | null> {
  const message = await gmail<GmailMessage>(token, `messages/${encodeURIComponent(id)}?format=raw`)
  if (!message.raw) return null
  return pickAttachment(await simpleParser(Buffer.from(message.raw, 'base64url')), attachmentId)
}

export async function sendGmail(token: string, from: string, input: SendMailInput) {
  const raw = await new MailComposer({
    from,
    to: input.to,
    cc: input.cc || undefined,
    subject: input.subject,
    text: input.body,
    html: input.html || undefined,
    attachments: input.attachments?.map(({ filename, contentType, content }) => ({
      filename,
      contentType,
      content,
    })),
  })
    .compile()
    .build()
  // The upload endpoint takes the raw message (up to 35 MB) rather than base64 JSON.
  // Gmail files the message in Sent itself.
  const response = await googleFetch(
    'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'message/rfc822' },
      body: new Uint8Array(raw),
    },
  )
  if (response.status === 401) throw new ReconnectRequired()
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(data?.error?.message || `Gmail returned ${response.status}`)
  }
}

/** Senders and recipients of the latest messages in Inbox and Sent. */
export async function contactsGmail(token: string, perFolder = 60): Promise<MailContact[]> {
  const headers = ['From', 'To', 'Cc'].map((name) => `metadataHeaders=${name}`).join('&')
  const lists = await Promise.all(
    ['INBOX', 'SENT'].map((label) =>
      gmail<{ messages?: { id: string }[] }>(
        token,
        `messages?labelIds=${label}&maxResults=${perFolder}`,
      ),
    ),
  )
  const messages = await Promise.all(
    lists
      .flatMap((list) => list.messages ?? [])
      .map((item) => gmail<GmailMessage>(token, `messages/${item.id}?format=metadata&${headers}`)),
  )
  return messages.flatMap((message) =>
    (message.payload?.headers ?? [])
      .flatMap((header) => header.value.split(','))
      .map(parseAddress)
      .filter((person) => person.address.includes('@')),
  )
}
