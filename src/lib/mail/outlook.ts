import {
  oauthSession,
  providerFetch,
  ReconnectRequired,
  saveConnection,
  type OAuthSecret,
  type TokenGrant,
} from '@/lib/connections'
import type { SpaceKey } from '@/types/workbench'
import {
  MAIL_PAGE_SIZE,
  type MailAttachmentFile,
  type MailAttachmentInfo,
  type MailContact,
  type MailFolder,
  type MailMessage,
  type MailQuery,
  type MailSummary,
  type SendMailInput,
} from './types'

/** Outlook mailboxes via OAuth 2.0 (authorization code) and Microsoft Graph, per user. */
const REQUIRED = [
  'OUTLOOK_CLIENT_ID',
  'OUTLOOK_CLIENT_SECRET',
  'OAUTH_TOKEN_ENCRYPTION_KEY',
] as const
const SCOPES = 'offline_access openid email User.Read Mail.ReadWrite Mail.Send'
const GRAPH = 'https://graph.microsoft.com/v1.0'

type GraphRecipient = { emailAddress?: { name?: string; address?: string } }

type GraphMessage = {
  id: string
  subject?: string
  from?: GraphRecipient
  toRecipients?: GraphRecipient[]
  ccRecipients?: GraphRecipient[]
  receivedDateTime?: string
  sentDateTime?: string
  isRead?: boolean
  hasAttachments?: boolean
  body?: { contentType: 'html' | 'text'; content: string }
}

type GraphAttachment = {
  id: string
  name?: string
  contentType?: string
  size?: number
  isInline?: boolean
  contentId?: string
  contentBytes?: string
}

export function outlookMissing() {
  return REQUIRED.filter((name) => !process.env[name])
}

function authority() {
  return `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID || 'common'}/oauth2/v2.0`
}

export function outlookCallbackUrl(origin: string) {
  return `${process.env.SITE_URL || origin}/api/oauth/outlook/callback`
}

export function outlookAuthorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: SCOPES,
    state,
    prompt: 'select_account',
  })
  return `${authority()}/authorize?${params}`
}

const microsoftFetch = (url: string, init?: RequestInit) => providerFetch('Microsoft', url, init)

async function requestToken(grant: Record<string, string>): Promise<TokenGrant> {
  const response = await microsoftFetch(`${authority()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID ?? '',
      client_secret: process.env.OUTLOOK_CLIENT_SECRET ?? '',
      scope: SCOPES,
      ...grant,
    }),
  })
  const data = (await response.json()) as Partial<TokenGrant> & {
    error?: string
    error_description?: string
  }
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description?.split('\r\n')[0] || data.error || 'Token request failed',
    )
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in ?? 3600,
  }
}

/** Saves the mailbox signed in through the OAuth callback as this user's mail for `space`. */
export async function connectOutlook(
  userId: string,
  space: SpaceKey,
  code: string,
  redirectUri: string,
) {
  const grant = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  const me = await graph<{ mail?: string; userPrincipalName?: string }>(
    grant.access_token,
    '/me?$select=mail,userPrincipalName',
  )
  await saveConnection(userId, `mail:${space}`, {
    provider: 'outlook',
    account: me.mail || me.userPrincipalName || 'Outlook account',
    secret: {
      accessToken: grant.access_token,
      refreshToken: grant.refresh_token ?? '',
      expiresAt: Date.now() + grant.expires_in * 1000,
    } satisfies OAuthSecret,
  })
}

/** A current Graph access token for this user's mailbox in `space`. */
export async function outlookToken(userId: string, space: SpaceKey) {
  const session = await oauthSession<OAuthSecret>(userId, `mail:${space}`, (refreshToken) =>
    requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  )
  return session.token
}

async function graph<T>(token: string, pathAndQuery: string, init: RequestInit = {}): Promise<T> {
  const response = await microsoftFetch(`${GRAPH}${pathAndQuery}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (response.status === 401) throw new ReconnectRequired()
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(data?.error?.message || `Microsoft Graph returned ${response.status}`)
  }
  return (response.status === 202 || response.status === 204 ? null : await response.json()) as T
}

function recipientName(recipient?: GraphRecipient) {
  return recipient?.emailAddress?.name || recipient?.emailAddress?.address || ''
}

function toSummary(message: GraphMessage): MailSummary {
  return {
    id: message.id,
    subject: message.subject || '(no subject)',
    from: recipientName(message.from) || 'Unknown sender',
    fromAddress: message.from?.emailAddress?.address ?? '',
    to: (message.toRecipients ?? []).map(recipientName).join(', '),
    date: message.receivedDateTime ?? message.sentDateTime ?? '',
    unread: message.isRead === false,
  }
}

const SUMMARY_FIELDS = 'id,subject,from,toRecipients,receivedDateTime,sentDateTime,isRead'

const validDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? value : '')

/**
 * One page of a folder, newest first. Dates use `$filter`; words use `$search`, which Graph
 * cannot combine with `$filter`, so a search with dates trims each page to the range.
 * The cursor is Graph's own next-page link, accepted only for this mailbox's folders.
 */
export async function listOutlook(
  token: string,
  folder: MailFolder,
  query: MailQuery = {},
  limit = query.limit ?? MAIL_PAGE_SIZE,
): Promise<{ messages: MailSummary[]; nextCursor: string | null }> {
  const folderName = folder === 'inbox' ? 'inbox' : 'sentitems'
  const after = validDate(query.after)
  const before = validDate(query.before)
  const search = query.search?.replace(/["\\]/g, ' ').trim()
  let path: string
  if (query.cursor) {
    if (!query.cursor.startsWith(`${GRAPH}/me/mailFolders/${folderName}/messages`)) {
      throw new Error('Invalid page token.')
    }
    path = query.cursor.slice(GRAPH.length)
  } else {
    const params = new URLSearchParams({ $top: String(limit), $select: SUMMARY_FIELDS })
    if (search) {
      params.set('$search', `"${search}"`)
    } else {
      params.set('$orderby', 'receivedDateTime desc')
      const range = [
        after && `receivedDateTime ge ${new Date(after).toISOString()}`,
        before && `receivedDateTime lt ${new Date(before).toISOString()}`,
      ].filter(Boolean)
      if (range.length) params.set('$filter', range.join(' and '))
    }
    path = `/me/mailFolders/${folderName}/messages?${params}`
  }
  const data = await graph<{ value: GraphMessage[]; '@odata.nextLink'?: string }>(token, path)
  let messages = data.value.map(toSummary)
  if (search && (after || before)) {
    messages = messages.filter(
      (message) =>
        (!after || message.date >= new Date(after).toISOString()) &&
        (!before || message.date < new Date(before).toISOString()),
    )
  }
  return { messages, nextCursor: data['@odata.nextLink'] ?? null }
}

export async function markReadOutlook(token: string, id: string) {
  await graph(token, `/me/messages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  })
}

/** One message with its body; `markRead: false` only peeks (for prefetching). */
export async function readOutlook(
  token: string,
  id: string,
  markRead = true,
): Promise<MailMessage | null> {
  const message = await graph<GraphMessage>(
    token,
    `/me/messages/${encodeURIComponent(id)}?$select=${SUMMARY_FIELDS},body,hasAttachments`,
  )
  if (markRead && !message.isRead) await markReadOutlook(token, id).catch(() => {})
  const isHtml = message.body?.contentType === 'html'
  let html = isHtml ? (message.body?.content ?? '') : null
  const attachments: MailAttachmentInfo[] = []
  if (message.hasAttachments || (html && html.includes('cid:'))) {
    // Details only (no file contents), so big attachments do not slow the message down.
    const list = await graph<{ value: GraphAttachment[] }>(
      token,
      `/me/messages/${encodeURIComponent(id)}/attachments?$select=id,name,contentType,size,isInline`,
    ).catch(() => ({ value: [] as GraphAttachment[] }))
    let embedded = 0
    for (const item of list.value) {
      // Small inline images used by the body are embedded so they display.
      if (
        html &&
        item.isInline &&
        item.contentType?.startsWith('image/') &&
        (item.size ?? 0) <= 2 * 1024 * 1024 &&
        embedded + (item.size ?? 0) <= 6 * 1024 * 1024
      ) {
        const full = await graph<GraphAttachment>(
          token,
          `/me/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(item.id)}`,
        ).catch(() => null)
        const cid = full?.contentId?.replace(/^<|>$/g, '')
        if (full?.contentBytes && cid && html.includes(`cid:${cid}`)) {
          html = html
            .split(`cid:${cid}`)
            .join(`data:${item.contentType};base64,${full.contentBytes}`)
          embedded += item.size ?? 0
          continue
        }
      }
      attachments.push({
        id: item.id,
        filename: item.name || 'attachment',
        contentType: item.contentType || 'application/octet-stream',
        size: item.size ?? 0,
      })
    }
  }
  return {
    ...toSummary(message),
    unread: false,
    html,
    text: isHtml ? '' : (message.body?.content ?? ''),
    attachments,
  }
}

/** One attachment's bytes, via Graph's raw `$value` stream. */
export async function attachmentOutlook(
  token: string,
  id: string,
  attachmentId: string,
): Promise<MailAttachmentFile | null> {
  const base = `/me/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`
  const meta = await graph<GraphAttachment>(token, `${base}?$select=name,contentType,size`)
  const response = await microsoftFetch(`${GRAPH}${base}/$value`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) throw new ReconnectRequired()
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Microsoft Graph returned ${response.status}`)
  return {
    filename: meta.name || 'attachment',
    contentType: meta.contentType || 'application/octet-stream',
    content: Buffer.from(await response.arrayBuffer()),
  }
}

/** Graph's single-request sendMail tops out near 4 MB including base64 attachments. */
const OUTLOOK_ATTACHMENT_BYTES = 3 * 1024 * 1024

const recipients = (list?: string) =>
  (list ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }))

export async function sendOutlook(token: string, input: SendMailInput) {
  const attachments = input.attachments ?? []
  const size = attachments.reduce((sum, file) => sum + file.content.length, 0)
  if (size > OUTLOOK_ATTACHMENT_BYTES) {
    throw new Error('Outlook can send up to 3 MB of attachments per message from here.')
  }
  await graph(token, '/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: input.html
          ? { contentType: 'HTML', content: input.html }
          : { contentType: 'Text', content: input.body },
        toRecipients: recipients(input.to),
        ccRecipients: recipients(input.cc),
        attachments: attachments.map((file) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: file.filename,
          contentType: file.contentType,
          contentBytes: file.content.toString('base64'),
        })),
      },
      saveToSentItems: true,
    }),
  })
}

/** Senders and recipients of the latest messages in Inbox and Sent Items. */
export async function contactsOutlook(token: string, perFolder = 100): Promise<MailContact[]> {
  const pages = await Promise.all(
    ['inbox', 'sentitems'].map((folder) =>
      graph<{ value: GraphMessage[] }>(
        token,
        `/me/mailFolders/${folder}/messages?$top=${perFolder}&$select=from,toRecipients,ccRecipients`,
      ),
    ),
  )
  return pages
    .flatMap((page) => page.value)
    .flatMap((message) => [
      message.from,
      ...(message.toRecipients ?? []),
      ...(message.ccRecipients ?? []),
    ])
    .map((person) => ({
      name: person?.emailAddress?.name ?? '',
      address: person?.emailAddress?.address ?? '',
    }))
    .filter((person) => person.address.includes('@'))
}
