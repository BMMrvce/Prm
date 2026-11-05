import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SpaceKey } from '@/types/workbench'

/**
 * Server-only store for each user's connected accounts (mailboxes, YouTube). Rows live in
 * the `user_connections` table, which browsers cannot read; the secret part is encrypted
 * here with AES-256-GCM under OAUTH_TOKEN_ENCRYPTION_KEY before it is written. Until the
 * table exists (migration 202611050004 not run yet) rows fall back to files in `.data/`.
 */
export type ConnectionKey = `mail:${SpaceKey}` | 'youtube'

export type Connection<T> = { provider: string; account: string; secret: T }

/** The stored sign-in no longer works; the user has to connect the account again. */
export class ReconnectRequired extends Error {}

const STORE_DIR = path.join(process.cwd(), '.data')
let warnedFallback = false

function encryptionKey() {
  const raw = process.env.OAUTH_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY is not set.')
  const decoded = Buffer.from(raw, 'base64')
  // Accept a base64 32-byte key as documented, or derive one from any other string.
  return decoded.length === 32 ? decoded : createHash('sha256').update(raw).digest()
}

function seal(value: unknown) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join('.')
}

function unseal<T>(payload: string): T | null {
  try {
    const [iv, tag, data] = payload.split('.').map((part) => Buffer.from(part, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
    decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'))
  } catch {
    // Wrong key or corrupt value: treat as disconnected so the user can reconnect.
    return null
  }
}

const fileFor = (name: string) => path.join(STORE_DIR, `${name}.enc`)
// `conn-` keeps these apart from the earlier file-only store's `youtube-<user>` files.
const fileName = (userId: string, key: ConnectionKey) => `conn-${key.replace(':', '-')}-${userId}`

async function readFileRow(name: string) {
  try {
    return await readFile(fileFor(name), 'utf8')
  } catch {
    return null
  }
}

async function writeFileRow(name: string, payload: string) {
  await mkdir(STORE_DIR, { recursive: true, mode: 0o700 })
  await writeFile(fileFor(name), payload, { mode: 0o600 })
}

/** True when PostgREST says the table is missing, i.e. the migration has not been run. */
function tableMissing(error: { code?: string } | null) {
  if (error?.code !== 'PGRST205' && error?.code !== '42P01') return false
  if (!warnedFallback) {
    warnedFallback = true
    console.warn(
      '[connections] user_connections table not found; storing sign-ins in .data/. ' +
        'Run supabase/migrations/202611050004_user_connections.sql.',
    )
  }
  return true
}

type FileRow = { provider: string; account: string; secret: string }

export async function getConnection<T>(
  userId: string,
  key: ConnectionKey,
): Promise<Connection<T> | null> {
  const { data, error } = await createAdminClient()
    .from('user_connections')
    .select('provider,account,secret')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle()
  let row: FileRow | null = data
  if (error) {
    if (!tableMissing(error)) throw new Error(error.message)
    const payload = await readFileRow(fileName(userId, key))
    row = payload ? unseal<FileRow>(payload) : null
  }
  if (!row) return key === 'youtube' ? importLegacyYouTube<T>(userId) : null
  const secret = unseal<T>(row.secret)
  return secret ? { provider: row.provider, account: row.account, secret } : null
}

export async function saveConnection(
  userId: string,
  key: ConnectionKey,
  value: Connection<unknown>,
) {
  const row = { provider: value.provider, account: value.account, secret: seal(value.secret) }
  const { error } = await createAdminClient()
    .from('user_connections')
    .upsert({ user_id: userId, key, ...row }, { onConflict: 'user_id,key' })
  if (!error) return
  if (!tableMissing(error)) throw new Error(error.message)
  await writeFileRow(fileName(userId, key), seal(row))
}

export async function deleteConnection(userId: string, key: ConnectionKey) {
  const { error } = await createAdminClient()
    .from('user_connections')
    .delete()
    .eq('user_id', userId)
    .eq('key', key)
  if (error && !tableMissing(error)) throw new Error(error.message)
  await rm(fileFor(fileName(userId, key)), { force: true })
}

/** Moves a YouTube sign-in saved by the earlier file-only store into this one. */
async function importLegacyYouTube<T>(userId: string): Promise<Connection<T> | null> {
  const legacy = path.join(STORE_DIR, `youtube-${userId}.enc`)
  const payload = await readFile(legacy, 'utf8').catch(() => null)
  const secret = payload ? unseal<T & { account?: string }>(payload) : null
  if (!secret) return null
  const connection = { provider: 'youtube', account: secret.account ?? '', secret }
  await saveConnection(userId, 'youtube', connection)
  await rm(legacy, { force: true })
  return connection
}

export type OAuthSecret = { accessToken: string; refreshToken: string; expiresAt: number }

export type TokenGrant = { access_token: string; refresh_token?: string; expires_in: number }

/**
 * A current access token for an OAuth connection, refreshing (and saving) it when it is
 * about to expire. A failed refresh deletes the connection and throws ReconnectRequired.
 */
export async function oauthSession<T extends OAuthSecret>(
  userId: string,
  key: ConnectionKey,
  refresh: (refreshToken: string) => Promise<TokenGrant>,
): Promise<Connection<T> & { token: string }> {
  const connection = await getConnection<T>(userId, key)
  if (!connection) throw new ReconnectRequired()
  const { secret } = connection
  if (secret.expiresAt - 60_000 > Date.now()) return { ...connection, token: secret.accessToken }
  if (!secret.refreshToken) throw new ReconnectRequired()
  let grant: TokenGrant
  try {
    grant = await refresh(secret.refreshToken)
  } catch (error) {
    // Network trouble is temporary; anything else means the grant was revoked or expired.
    if (error instanceof Error && error.message.startsWith('Could not reach')) throw error
    await deleteConnection(userId, key)
    throw new ReconnectRequired()
  }
  const next = {
    ...connection,
    secret: {
      ...secret,
      accessToken: grant.access_token,
      refreshToken: grant.refresh_token ?? secret.refreshToken,
      expiresAt: Date.now() + grant.expires_in * 1000,
    },
  }
  await saveConnection(userId, key, next)
  return { ...next, token: grant.access_token }
}

/**
 * `fetch` that retries once on a network failure and, if it fails again, names the real
 * cause: Node only says "fetch failed" and hides it in `error.cause`.
 */
export async function providerFetch(
  service: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, { cache: 'no-store', ...init })
    } catch (error) {
      if (attempt < 2) continue
      const cause = (error as { cause?: { code?: string; message?: string } }).cause
      const reason = cause?.code || cause?.message || (error as Error).message
      console.error(`[${service}] request to ${new URL(url).host} failed:`, error)
      throw new Error(`Could not reach ${service} (${reason}). Check the connection and try again.`)
    }
  }
}
