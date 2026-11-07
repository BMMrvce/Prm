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
 * Open IMAP sessions, reused for a short while: every request logging in afresh (list,
 * open, contacts…) quickly trips Hostinger's login limits. Keyed by a hash of the login so
 * a changed password never reuses a session.
 */
const IDLE_MS = 45_000
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
  if (session && !session.client.usable && session.users === 0) {
    drop(key, session)
    session = undefined
  }
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
    throw error
  }
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

/** Runs `run` on a pooled session, retrying once on a fresh one if the connection broke. */
async function withImap<T>(login: HostingerLogin, run: (client: ImapFlow) => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    let lease: Awaited<ReturnType<typeof acquire>> | undefined
    try {
      lease = await acquire(login)
      const result = await run(lease.client)
      lease.release(false)
      return result
    } catch (error) {
      const broken = !lease || !lease.client.usable
      lease?.release(broken)
      if (!broken || isAuthFailure(error) || attempt >= 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 800))
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
