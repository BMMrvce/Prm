import {
  oauthSession,
  providerFetch,
  ReconnectRequired,
  saveConnection,
  type OAuthSecret,
  type TokenGrant,
} from '@/lib/connections'
import type { SpaceKey } from '@/types/workbench'
import type { MailContact, MailFolder, MailMessage, MailSummary, SendMailInput } from './types'

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
  body?: { contentType: 'html' | 'text'; content: string }
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

export async function listOutlook(
  token: string,
  folder: MailFolder,
  limit = 30,
): Promise<MailSummary[]> {
  const folderName = folder === 'inbox' ? 'inbox' : 'sentitems'
  const query = new URLSearchParams({
    $top: String(limit),
    $select: SUMMARY_FIELDS,
    $orderby: 'receivedDateTime desc',
  })
  const data = await graph<{ value: GraphMessage[] }>(
    token,
    `/me/mailFolders/${folderName}/messages?${query}`,
  )
  return data.value.map(toSummary)
}

export async function readOutlook(token: string, id: string): Promise<MailMessage | null> {
  const message = await graph<GraphMessage>(
    token,
    `/me/messages/${encodeURIComponent(id)}?$select=${SUMMARY_FIELDS},body`,
  )
  if (!message.isRead) {
    await graph(token, `/me/messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    }).catch(() => {})
  }
  const isHtml = message.body?.contentType === 'html'
  return {
    ...toSummary(message),
    unread: false,
    html: isHtml ? (message.body?.content ?? '') : null,
    text: isHtml ? '' : (message.body?.content ?? ''),
  }
}

export async function sendOutlook(token: string, { to, subject, body }: SendMailInput) {
  await graph(token, '/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: to
          .split(',')
          .map((address) => address.trim())
          .filter(Boolean)
          .map((address) => ({ emailAddress: { address } })),
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
