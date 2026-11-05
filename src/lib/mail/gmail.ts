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
import type { SpaceKey } from '@/types/workbench'
import type { MailContact, MailFolder, MailMessage, MailSummary, SendMailInput } from './types'

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

export async function listGmail(
  token: string,
  folder: MailFolder,
  limit = 30,
): Promise<MailSummary[]> {
  const label = folder === 'inbox' ? 'INBOX' : 'SENT'
  const list = await gmail<{ messages?: { id: string }[] }>(
    token,
    `messages?labelIds=${label}&maxResults=${limit}`,
  )
  const headers = ['From', 'To', 'Subject'].map((name) => `metadataHeaders=${name}`).join('&')
  const messages = await Promise.all(
    (list.messages ?? []).map((item) =>
      gmail<GmailMessage>(token, `messages/${item.id}?format=metadata&${headers}`),
    ),
  )
  return messages.map(toSummary).sort((a, b) => b.date.localeCompare(a.date))
}

function addresses(value?: AddressObject | AddressObject[]) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list.flatMap((item) => item.value)
}

export async function readGmail(token: string, id: string): Promise<MailMessage | null> {
  const message = await gmail<GmailMessage>(token, `messages/${encodeURIComponent(id)}?format=raw`)
  if (!message.raw) return null
  if (message.labelIds?.includes('UNREAD')) {
    await gmail(token, `messages/${encodeURIComponent(id)}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    }).catch(() => {})
  }
  const parsed = await simpleParser(Buffer.from(message.raw, 'base64url'))
  const sender = addresses(parsed.from)[0]
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
    html: parsed.html || null,
    text: parsed.text ?? '',
  }
}

export async function sendGmail(token: string, from: string, { to, subject, body }: SendMailInput) {
  const raw = await new MailComposer({ from, to, subject, text: body }).compile().build()
  // Gmail files the message in Sent itself.
  await gmail(token, 'messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: raw.toString('base64url') }),
  })
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
