import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { simpleParser, type AddressObject } from 'mailparser'
import nodemailer from 'nodemailer'
import MailComposer from 'nodemailer/lib/mail-composer'
import type { MailFolder, MailMessage, MailSummary, SendMailInput } from './types'

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

async function withImap<T>({ user, pass }: HostingerLogin, run: (client: ImapFlow) => Promise<T>) {
  const { imapHost, imapPort } = servers()
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapPort === 993,
    auth: { user, pass },
    logger: false,
  })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.logout().catch(() => {})
  }
}

async function mailboxPath(client: ImapFlow, folder: MailFolder) {
  if (folder === 'inbox') return 'INBOX'
  const boxes = await client.list()
  return boxes.find((box) => box.specialUse === '\\Sent')?.path ?? 'INBOX.Sent'
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

export async function listHostinger(
  login: HostingerLogin,
  folder: MailFolder,
  limit = 30,
): Promise<MailSummary[]> {
  return withImap(login, async (client) => {
    const lock = await client.getMailboxLock(await mailboxPath(client, folder), { readOnly: true })
    try {
      const exists = client.mailbox ? client.mailbox.exists : 0
      if (!exists) return []
      const range = `${Math.max(1, exists - limit + 1)}:*`
      const messages = await client.fetchAll(range, {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
      })
      return messages.map(toSummary).reverse()
    } finally {
      lock.release()
    }
  })
}

function parsedAddresses(value?: AddressObject | AddressObject[]) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list.flatMap((item) => item.value)
}

export async function readHostinger(
  login: HostingerLogin,
  folder: MailFolder,
  id: string,
): Promise<MailMessage | null> {
  return withImap(login, async (client) => {
    const lock = await client.getMailboxLock(await mailboxPath(client, folder))
    try {
      const message = await client.fetchOne(
        id,
        { uid: true, source: true, flags: true, envelope: true, internalDate: true },
        { uid: true },
      )
      if (!message || !message.source) return null
      if (!message.flags?.has('\\Seen')) {
        await client.messageFlagsAdd(id, ['\\Seen'], { uid: true })
      }
      const parsed = await simpleParser(message.source)
      const sender = parsedAddresses(parsed.from)[0]
      return {
        ...toSummary(message),
        from: sender?.name || sender?.address || 'Unknown sender',
        fromAddress: sender?.address ?? '',
        to: parsedAddresses(parsed.to)
          .map((item) => item.name || item.address)
          .join(', '),
        unread: false,
        html: parsed.html || null,
        text: parsed.text ?? '',
      }
    } finally {
      lock.release()
    }
  })
}

export async function sendHostinger(login: HostingerLogin, { to, subject, body }: SendMailInput) {
  const { smtpHost, smtpPort } = servers()
  const { user, pass } = login
  const raw = await new MailComposer({ from: user, to, subject, text: body }).compile().build()
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
