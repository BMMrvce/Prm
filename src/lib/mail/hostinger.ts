import { createHash } from 'node:crypto'
import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { simpleParser, type AddressObject } from 'mailparser'
import nodemailer from 'nodemailer'
import MailComposer from 'nodemailer/lib/mail-composer'
import { attachmentsOf, pickAttachment } from './attachments'
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

/**
 * Hostinger mail: IMAP for reading, SMTP for sending, signed in with the user's own
 * mailbox address and password. The servers are fixed to Hostinger's (overridable by the
 * deployer in .env) so users can never point the server at another host.
 */
export type HostingerLogin = { user: string; pass: string }

function servers() {
  return {
    imapHost: process.env.HOSTINGER_IMAP_HOST || 'imap.hostinger.com',
    imapPort: Number(process.env.HOSTINGER_IMAP_PORT || 993),
    smtpHost: process.env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com',
    smtpPort: Number(process.env.HOSTINGER_SMTP_PORT || 465),
  }
}

/**
 * Open IMAP sessions, reused across requests: every request logging in afresh (list, open,
 * the once-a-minute new-mail check…) quickly trips Hostinger's connection limits, which
 * shows up as "Unexpected close" while connecting. A session stays open for a few minutes
 * after its last use (imapflow keeps it alive with IMAP IDLE), so periodic checks reuse one
 * login. Keyed by a hash of the login so a changed password never reuses a session.
 */
const IDLE_MS = 5 * 60_000
/** After the server refuses a connection, wait this long before trying again. */
const COOLDOWN_MS = 2_000
const cooldowns = new Map<string, number>()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** imapflow's codes for a connection that went away (or was refused while connecting). */
const GONE_CODES = new Set([
  'NoConnection',
  'EConnectionClosed',
  'StateLogout',
  'ClosedAfterConnectTLS',
  'ClosedAfterConnectText',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
])

/** True for dropped or refused connections, which are worth retrying on a fresh session. */
export function isConnectionGone(error: unknown) {
  const details = (error && typeof error === 'object' ? error : {}) as {
    code?: string
    message?: string
  }
  return (
    GONE_CODES.has(details.code ?? '') ||
    /unexpected close|connection closed|socket (hang up|closed)/i.test(details.message ?? '')
  )
}
type PooledSession = {
  client: ImapFlow
  ready: Promise<void>
  users: number
  idle?: NodeJS.Timeout
}
const pool = new Map<string, PooledSession>()

const poolKey = ({ user, pass }: HostingerLogin) =>
  createHash('sha256').update(`${user}\0${pass}`).digest('hex')

function drop(key: string, session: PooledSession) {
  if (pool.get(key) === session) pool.delete(key)
  clearTimeout(session.idle)
  session.client.logout().catch(() => {})
}

async function acquire(login: HostingerLogin) {
  const key = poolKey(login)
  let session = pool.get(key)
  // Never hand out a dead connection. One still in use by another request is only taken
  // out of the pool (that request fails and retries); an unused one is closed.
  if (session && !session.client.usable) {
    if (session.users === 0) drop(key, session)
    else if (pool.get(key) === session) pool.delete(key)
    session = undefined
  }
  // The server just refused us: give it a moment instead of reconnecting straight away.
  const wait = (cooldowns.get(key) ?? 0) - Date.now()
  if (!session && wait > 0) await sleep(wait)
  if (!session) session = pool.get(key)
  if (!session) {
    const { imapHost, imapPort } = servers()
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapPort === 993,
      auth: { user: login.user, pass: login.pass },
      logger: false,
    })
    // Socket errors surface through the pending command; an unhandled 'error' event would crash.
    client.on('error', () => {})
    const created: PooledSession = { client, ready: client.connect(), users: 0 }
    client.on('close', () => {
      if (pool.get(key) === created) pool.delete(key)
    })
    pool.set(key, created)
    session = created
  }
  const current = session
  try {
    await current.ready
  } catch (error) {
    drop(key, current)
    if (isConnectionGone(error)) cooldowns.set(key, Date.now() + COOLDOWN_MS)
    throw error
  }
  cooldowns.delete(key)
  clearTimeout(current.idle)
  current.users++
  return {
    client: current.client,
    release: (broken: boolean) => {
      current.users--
      if (broken) return drop(key, current)
      if (current.users === 0) {
        current.idle = setTimeout(() => drop(key, current), IDLE_MS)
        current.idle.unref?.()
      }
    },
  }
}

const isAuthFailure = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'authenticationFailed' in error)

/** Waits before each retry of a dropped connection. */
const RETRY_DELAYS = [600, 1800]

/**
 * Runs `run` on a pooled session. If the connection dropped or was refused, it retries on a
 * fresh session (up to twice, waiting a little longer each time); wrong passwords and
 * ordinary command errors are reported straight away.
 */
async function withImap<T>(login: HostingerLogin, run: (client: ImapFlow) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    let lease: Awaited<ReturnType<typeof acquire>> | undefined
    try {
      lease = await acquire(login)
      const result = await run(lease.client)
      lease.release(false)
      return result
    } catch (error) {
      const gone = !lease || !lease.client.usable || isConnectionGone(error)
      lease?.release(gone)
      if (!gone || isAuthFailure(error) || attempt >= RETRY_DELAYS.length) throw error
      await sleep(RETRY_DELAYS[attempt])
    }
  }
}

/** The Sent folder's path per (pooled) session, so it is looked up once, not per request. */
const sentPaths = new WeakMap<ImapFlow, string>()

async function mailboxPath(client: ImapFlow, folder: MailFolder) {
  if (folder === 'inbox') return 'INBOX'
  const known = sentPaths.get(client)
  if (known) return known
  const boxes = await client.list()
  const path = boxes.find((box) => box.specialUse === '\\Sent')?.path ?? 'INBOX.Sent'
  sentPaths.set(client, path)
  return path
}

function addressList(list?: { name?: string; address?: string }[]) {
  return (list ?? []).map((item) => item.name || item.address || '').join(', ')
}

function toSummary(message: FetchMessageObject): MailSummary {
  const envelope = message.envelope
  const sender = envelope?.from?.[0]
  const date = envelope?.date ?? message.internalDate
  return {
    id: String(message.uid),
    subject: envelope?.subject || '(no subject)',
    from: sender?.name || sender?.address || 'Unknown sender',
    fromAddress: sender?.address ?? '',
    to: addressList(envelope?.to),
    date: date ? new Date(date).toISOString() : '',
    unread: !message.flags?.has('\\Seen'),
  }
}

/** Signs in once to check the address and password before they are saved. */
export async function verifyHostinger(login: HostingerLogin) {
  await withImap(login, async () => undefined)
}

const DAY_MS = 86_400_000

/**
 * One page of a folder, newest first. IMAP searches by whole days (SINCE / BEFORE) and the
 * words anywhere in the message (TEXT); the day window is padded a day each side for
 * timezones, then trimmed to the exact instants. The cursor is how many matches to skip.
 */
export async function listHostinger(
  login: HostingerLogin,
  folder: MailFolder,
  query: MailQuery = {},
  limit = query.limit ?? MAIL_PAGE_SIZE,
): Promise<{ messages: MailSummary[]; nextCursor: string | null }> {
  const after = query.after && !Number.isNaN(Date.parse(query.after)) ? new Date(query.after) : null
  const before =
    query.before && !Number.isNaN(Date.parse(query.before)) ? new Date(query.before) : null
  const search = query.search?.trim()
  const offset = Math.max(0, Number.parseInt(query.cursor ?? '0', 10) || 0)
  return withImap(login, async (client) => {
    const lock = await client.getMailboxLock(await mailboxPath(client, folder), { readOnly: true })
    try {
      const exists = client.mailbox ? client.mailbox.exists : 0
      if (!exists) return { messages: [], nextCursor: null }
      const fields = { uid: true, envelope: true, flags: true, internalDate: true } as const
      // No filters: read the newest messages by position, no server-side search needed.
      if (!after && !before && !search) {
        const end = exists - offset
        if (end < 1) return { messages: [], nextCursor: null }
        const start = Math.max(1, end - limit + 1)
        const fetched = await client.fetchAll(`${start}:${end}`, fields)
        return {
          messages: fetched.map(toSummary).sort((a, b) => b.date.localeCompare(a.date)),
          nextCursor: start > 1 ? String(offset + limit) : null,
        }
      }
      const criteria = {
        ...(after ? { since: new Date(after.getTime() - DAY_MS) } : {}),
        ...(before ? { before: new Date(before.getTime() + DAY_MS) } : {}),
        ...(search ? { text: search } : {}),
      }
      const uids = (await client.search(criteria, { uid: true })) || []
      // Highest UID = newest arrival.
      const page = [...uids].sort((a, b) => b - a).slice(offset, offset + limit)
      if (!page.length) return { messages: [], nextCursor: null }
      const fetched = await client.fetchAll(page.join(','), fields, { uid: true })
      const messages = fetched
        .map(toSummary)
        .filter(
          (message) =>
            (!after || message.date >= after.toISOString()) &&
            (!before || message.date < before.toISOString()),
        )
        .sort((a, b) => b.date.localeCompare(a.date))
      const next = offset + limit
      return { messages, nextCursor: next < uids.length ? String(next) : null }
    } finally {
      lock.release()
    }
  })
}

function parsedAddresses(value?: AddressObject | AddressObject[]) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list.flatMap((item) => item.value)
}

export async function markReadHostinger(login: HostingerLogin, folder: MailFolder, id: string) {
  await withImap(login, async (client) => {
    const lock = await client.getMailboxLock(await mailboxPath(client, folder))
    try {
      await client.messageFlagsAdd(id, ['\\Seen'], { uid: true })
    } finally {
      lock.release()
    }
  })
}

/** One message with its body; `markRead: false` only peeks (for prefetching). */
export async function readHostinger(
  login: HostingerLogin,
  folder: MailFolder,
  id: string,
  markRead = true,
): Promise<MailMessage | null> {
  return withImap(login, async (client) => {
    const lock = await client.getMailboxLock(await mailboxPath(client, folder), {
      readOnly: !markRead,
    })
    try {
      const message = await client.fetchOne(
        id,
        { uid: true, source: true, flags: true, envelope: true, internalDate: true },
        { uid: true },
      )
      if (!message || !message.source) return null
      if (markRead && !message.flags?.has('\\Seen')) {
        await client.messageFlagsAdd(id, ['\\Seen'], { uid: true })
      }
      const parsed = await simpleParser(message.source)
      const sender = parsedAddresses(parsed.from)[0]
      const { html, attachments } = attachmentsOf(parsed)
      return {
        ...toSummary(message),
        from: sender?.name || sender?.address || 'Unknown sender',
        fromAddress: sender?.address ?? '',
        to: parsedAddresses(parsed.to)
          .map((item) => item.name || item.address)
          .join(', '),
        unread: false,
        html,
        text: parsed.text ?? '',
        attachments,
      }
    } finally {
      lock.release()
    }
  })
}

/** One attachment of a message, by its index in the parsed message. */
export async function attachmentHostinger(
  login: HostingerLogin,
  folder: MailFolder,
  id: string,
  attachmentId: string,
): Promise<MailAttachmentFile | null> {
  return withImap(login, async (client) => {
    const lock = await client.getMailboxLock(await mailboxPath(client, folder), { readOnly: true })
    try {
      const message = await client.fetchOne(id, { uid: true, source: true }, { uid: true })
      if (!message || !message.source) return null
      return pickAttachment(await simpleParser(message.source), attachmentId)
    } finally {
      lock.release()
    }
  })
}

export async function sendHostinger(login: HostingerLogin, input: SendMailInput) {
  const { smtpHost, smtpPort } = servers()
  const { user, pass } = login
  const raw = await new MailComposer({
    from: user,
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
  // SMTP envelope: every To and Cc address.
  const to = [input.to, input.cc ?? '']
    .join(',')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass },
  })
  await transport.sendMail({ envelope: { from: user, to }, raw })
  // Hostinger SMTP does not file outgoing mail, so keep a copy in Sent like a desktop client.
  await withImap(login, async (client) => {
    await client.append(await mailboxPath(client, 'sent'), raw, ['\\Seen'])
  }).catch(() => {})
}

/** Senders and recipients of the latest messages in Inbox and Sent. */
export async function contactsHostinger(login: HostingerLogin, perFolder = 150) {
  return withImap(login, async (client) => {
    const found: MailContact[] = []
    for (const folder of ['inbox', 'sent'] as const) {
      const lock = await client.getMailboxLock(await mailboxPath(client, folder), {
        readOnly: true,
      })
      try {
        const exists = client.mailbox ? client.mailbox.exists : 0
        if (!exists) continue
        const messages = await client.fetchAll(`${Math.max(1, exists - perFolder + 1)}:*`, {
          envelope: true,
        })
        for (const message of messages) {
          const envelope = message.envelope
          for (const person of [
            ...(envelope?.from ?? []),
            ...(envelope?.to ?? []),
            ...(envelope?.cc ?? []),
          ]) {
            if (person.address) found.push({ name: person.name ?? '', address: person.address })
          }
        }
      } finally {
        lock.release()
      }
    }
    return found
  })
}
