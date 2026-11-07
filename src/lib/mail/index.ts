import {
  deleteConnection,
  getConnection,
  ReconnectRequired,
  saveConnection,
} from '@/lib/connections'
import { googleMissing } from '@/lib/google'
import type { SpaceKey } from '@/types/workbench'
import {
  attachmentGmail,
  contactsGmail,
  gmailToken,
  listGmail,
  markReadGmail,
  readGmail,
  sendGmail,
} from './gmail'
import {
  attachmentHostinger,
  contactsHostinger,
  listHostinger,
  markReadHostinger,
  readHostinger,
  sendHostinger,
  verifyHostinger,
  type HostingerLogin,
} from './hostinger'
import {
  attachmentOutlook,
  contactsOutlook,
  listOutlook,
  markReadOutlook,
  outlookMissing,
  outlookToken,
  readOutlook,
  sendOutlook,
} from './outlook'
import { mailOptions, PROVIDER_LABEL } from './providers'
import type {
  MailAttachmentFile,
  MailContact,
  MailFolder,
  MailListResponse,
  MailMessage,
  MailOption,
  MailProviderKey,
  MailQuery,
  MailStatus,
  MailSummary,
  SendMailInput,
} from './types'

/**
 * Server-only mail entry point. Every user connects their own mailbox per workspace:
 * Office → Hostinger, Gmail or Outlook; Studio → Outlook or Gmail; Personal → Gmail.
 */
type Mailbox = {
  list: (
    folder: MailFolder,
    query: MailQuery,
  ) => Promise<{ messages: MailSummary[]; nextCursor: string | null }>
  read: (folder: MailFolder, id: string, markRead: boolean) => Promise<MailMessage | null>
  markRead: (folder: MailFolder, id: string) => Promise<void>
  attachment: (
    folder: MailFolder,
    id: string,
    attachmentId: string,
  ) => Promise<MailAttachmentFile | null>
  send: (input: SendMailInput) => Promise<void>
  contacts: () => Promise<MailContact[]>
}

function option(provider: MailProviderKey): MailOption {
  const missing =
    provider === 'gmail' ? googleMissing() : provider === 'outlook' ? outlookMissing() : []
  return {
    provider,
    label: PROVIDER_LABEL[provider],
    available: !missing.length,
    note: missing.length ? `Server needs ${missing.join(', ')}` : undefined,
  }
}

const disconnected = (space: SpaceKey, note?: string): MailStatus => ({
  state: 'disconnected',
  options: mailOptions(space).map(option),
  note,
})

async function connection(userId: string, space: SpaceKey) {
  const row = await getConnection<unknown>(userId, `mail:${space}`)
  // A provider no longer offered for this workspace counts as not connected.
  return row && mailOptions(space).includes(row.provider as MailProviderKey) ? row : null
}

export async function mailStatus(userId: string, space: SpaceKey): Promise<MailStatus> {
  const row = await connection(userId, space)
  if (!row) return disconnected(space)
  const provider = row.provider as MailProviderKey
  return { state: 'connected', provider, label: PROVIDER_LABEL[provider], account: row.account }
}

type ConnectionRow = NonNullable<Awaited<ReturnType<typeof connection>>>

/** The provider client for `space`; pass the connection row when it is already loaded. */
async function openMailbox(
  userId: string,
  space: SpaceKey,
  known?: ConnectionRow,
): Promise<Mailbox> {
  const row = known ?? (await connection(userId, space))
  if (!row) throw new ReconnectRequired()
  if (row.provider === 'hostinger') {
    const login = row.secret as HostingerLogin
    return {
      list: (folder, query) => listHostinger(login, folder, query),
      read: (folder, id, markRead) => readHostinger(login, folder, id, markRead),
      markRead: (folder, id) => markReadHostinger(login, folder, id),
      attachment: (folder, id, attachmentId) =>
        attachmentHostinger(login, folder, id, attachmentId),
      send: (input) => sendHostinger(login, input),
      contacts: () => contactsHostinger(login),
    }
  }
  if (row.provider === 'gmail') {
    const token = await gmailToken(userId, space)
    return {
      list: (folder, query) => listGmail(token, folder, query),
      read: (_folder, id, markRead) => readGmail(token, id, markRead),
      markRead: (_folder, id) => markReadGmail(token, id),
      attachment: (_folder, id, attachmentId) => attachmentGmail(token, id, attachmentId),
      send: (input) => sendGmail(token, row.account, input),
      contacts: () => contactsGmail(token),
    }
  }
  const token = await outlookToken(userId, space)
  return {
    list: (folder, query) => listOutlook(token, folder, query),
    read: (_folder, id, markRead) => readOutlook(token, id, markRead),
    markRead: (_folder, id) => markReadOutlook(token, id),
    attachment: (_folder, id, attachmentId) => attachmentOutlook(token, id, attachmentId),
    send: (input) => sendOutlook(token, input),
    contacts: () => contactsOutlook(token),
  }
}

const EXPIRED = 'The mailbox sign-in expired or was revoked. Connect it again in Integrations.'

/**
 * One page of a folder (optionally searched and date-filtered), folding provider failures
 * into the response instead of throwing.
 */
export async function listMail(
  userId: string,
  space: SpaceKey,
  folder: MailFolder,
  query: MailQuery = {},
): Promise<MailListResponse> {
  // One connection lookup serves both the status and the mailbox.
  const row = await connection(userId, space)
  if (!row) return { status: disconnected(space), messages: [] }
  const provider = row.provider as MailProviderKey
  const status: MailStatus = {
    state: 'connected',
    provider,
    label: PROVIDER_LABEL[provider],
    account: row.account,
  }
  try {
    const mailbox = await openMailbox(userId, space, row)
    const page = await mailbox.list(folder, query)
    return { status, messages: page.messages, nextCursor: page.nextCursor }
  } catch (error) {
    if (error instanceof ReconnectRequired) {
      return { status: disconnected(space, EXPIRED), messages: [] }
    }
    return { status, messages: [], error: errorMessage(error) }
  }
}

/** One message; `markRead: false` peeks without changing its unread state. */
export async function readMail(
  userId: string,
  space: SpaceKey,
  folder: MailFolder,
  id: string,
  markRead = true,
) {
  return (await openMailbox(userId, space)).read(folder, id, markRead)
}

/** One attachment of a received message, for download. */
export async function mailAttachment(
  userId: string,
  space: SpaceKey,
  folder: MailFolder,
  id: string,
  attachmentId: string,
) {
  return (await openMailbox(userId, space)).attachment(folder, id, attachmentId)
}

export async function markMailRead(
  userId: string,
  space: SpaceKey,
  folder: MailFolder,
  id: string,
) {
  await (await openMailbox(userId, space)).markRead(folder, id)
}

export async function sendMail(userId: string, space: SpaceKey, input: SendMailInput) {
  await (await openMailbox(userId, space)).send(input)
}

const CONTACTS_TTL_MS = 10 * 60_000
const contactsCache = new Map<string, { at: number; contacts: MailContact[] }>()

/**
 * Unique people from recent mail, most frequent first, for recipient suggestions. Cached
 * per user and workspace for a few minutes because collecting them reads ~100 messages.
 */
export async function listContacts(userId: string, space: SpaceKey): Promise<MailContact[]> {
  const cacheKey = `${userId}:${space}`
  const cached = contactsCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CONTACTS_TTL_MS) return cached.contacts
  const row = await connection(userId, space)
  if (!row) return []
  const found = await (await openMailbox(userId, space)).contacts()
  const own = row.account.toLowerCase()
  const byAddress = new Map<string, MailContact & { count: number }>()
  for (const person of found) {
    const address = person.address.trim().toLowerCase()
    if (!address || address === own) continue
    const current = byAddress.get(address)
    byAddress.set(address, {
      name: current?.name || person.name.trim(),
      address,
      count: (current?.count ?? 0) + 1,
    })
  }
  const contacts = [...byAddress.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 500)
    .map(({ name, address }) => ({ name, address }))
  contactsCache.set(cacheKey, { at: Date.now(), contacts })
  return contacts
}

/** Checks a Hostinger address and password by signing in, then saves them for `space`. */
export async function connectHostinger(userId: string, space: SpaceKey, login: HostingerLogin) {
  if (!mailOptions(space).includes('hostinger')) {
    throw new Error('Hostinger Mail is not available for this workspace.')
  }
  await verifyHostinger(login)
  await saveConnection(userId, `mail:${space}`, {
    provider: 'hostinger',
    account: login.user,
    secret: login,
  })
}

export const disconnectMail = (userId: string, space: SpaceKey) =>
  deleteConnection(userId, `mail:${space}`)

export function errorMessage(error: unknown) {
  if (error instanceof ReconnectRequired) return EXPIRED
  const details = (error && typeof error === 'object' ? error : {}) as {
    authenticationFailed?: boolean
    responseText?: string
    code?: string
    message?: string
  }
  if (details.authenticationFailed) {
    return 'The mail server rejected the email address or password.'
  }
  // IMAP errors often say only "Command failed"; the server's own text is more useful.
  const text = [details.responseText, details.message].find(
    (value) => value && value !== 'Command failed',
  )
  if (/too many|limit|try again later|throttl/i.test(text ?? '')) {
    return 'The mail server is limiting sign-ins right now. Try again in a minute.'
  }
  if (
    details.code === 'NoConnection' ||
    details.code === 'ETIMEDOUT' ||
    details.code === 'ECONNRESET'
  ) {
    return 'Could not reach the mail server. Try again in a moment.'
  }
  return text || 'Something went wrong talking to the mail server.'
}
