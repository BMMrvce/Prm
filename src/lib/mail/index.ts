import {
  deleteConnection,
  getConnection,
  ReconnectRequired,
  saveConnection,
} from '@/lib/connections'
import { googleMissing } from '@/lib/google'
import type { SpaceKey } from '@/types/workbench'
import { gmailToken, listGmail, readGmail, sendGmail } from './gmail'
import {
  listHostinger,
  readHostinger,
  sendHostinger,
  verifyHostinger,
  type HostingerLogin,
} from './hostinger'
import { listOutlook, outlookMissing, outlookToken, readOutlook, sendOutlook } from './outlook'
import { mailOptions, PROVIDER_LABEL } from './providers'
import type {
  MailFolder,
  MailListResponse,
  MailMessage,
  MailOption,
  MailProviderKey,
  MailStatus,
  MailSummary,
  SendMailInput,
} from './types'

/**
 * Server-only mail entry point. Every user connects their own mailbox per workspace:
 * Office → Hostinger, Gmail or Outlook; Studio → Outlook or Gmail; Personal → Gmail.
 */
type Mailbox = {
  list: (folder: MailFolder) => Promise<MailSummary[]>
  read: (folder: MailFolder, id: string) => Promise<MailMessage | null>
  send: (input: SendMailInput) => Promise<void>
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

async function openMailbox(userId: string, space: SpaceKey): Promise<Mailbox> {
  const row = await connection(userId, space)
  if (!row) throw new ReconnectRequired()
  if (row.provider === 'hostinger') {
    const login = row.secret as HostingerLogin
    return {
      list: (folder) => listHostinger(login, folder),
      read: (folder, id) => readHostinger(login, folder, id),
      send: (input) => sendHostinger(login, input),
    }
  }
  if (row.provider === 'gmail') {
    const token = await gmailToken(userId, space)
    return {
      list: (folder) => listGmail(token, folder),
      read: (_folder, id) => readGmail(token, id),
      send: (input) => sendGmail(token, row.account, input),
    }
  }
  const token = await outlookToken(userId, space)
  return {
    list: (folder) => listOutlook(token, folder),
    read: (_folder, id) => readOutlook(token, id),
    send: (input) => sendOutlook(token, input),
  }
}

const EXPIRED = 'The mailbox sign-in expired or was revoked. Connect it again in Integrations.'

/** Lists a folder, folding provider failures into the response instead of throwing. */
export async function listMail(
  userId: string,
  space: SpaceKey,
  folder: MailFolder,
): Promise<MailListResponse> {
  const status = await mailStatus(userId, space)
  if (status.state !== 'connected') return { status, messages: [] }
  try {
    const mailbox = await openMailbox(userId, space)
    return { status, messages: await mailbox.list(folder) }
  } catch (error) {
    if (error instanceof ReconnectRequired) {
      return { status: disconnected(space, EXPIRED), messages: [] }
    }
    return { status, messages: [], error: errorMessage(error) }
  }
}

export async function readMail(userId: string, space: SpaceKey, folder: MailFolder, id: string) {
  return (await openMailbox(userId, space)).read(folder, id)
}

export async function sendMail(userId: string, space: SpaceKey, input: SendMailInput) {
  await (await openMailbox(userId, space)).send(input)
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
  if (error && typeof error === 'object' && 'authenticationFailed' in error) {
    return 'The mail server rejected the email address or password.'
  }
  return error instanceof Error ? error.message : 'Something went wrong talking to the mail server.'
}
