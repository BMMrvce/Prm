import {
  deleteConnection,
  getConnection,
  oauthSession,
  ReconnectRequired,
  saveConnection,
  type OAuthSecret,
  type TokenGrant,
} from './connections'
import { googleFetch, googleMissing, refreshGoogleToken } from './google'

/**
 * A YouTube playlist the user picks, read with the YouTube Data API. YouTube's own
 * "Watch later" list is not available to any app, so the user saves videos to a normal
 * playlist instead. Each ಸKala² user connects their own Google account.
 */
const API = 'https://www.googleapis.com/youtube/v3'
/** Playlist items fetched at most (50 per page). */
const MAX_PAGES = 4

type YouTubeSecret = OAuthSecret & { playlistId: string | null; playlistTitle: string | null }

export type YouTubePlaylist = { id: string; title: string; count: number }

export type YouTubeVideo = {
  id: string
  title: string
  channel: string
  thumbnail: string | null
  /** When the video was added to the playlist. */
  addedAt: string
  url: string
}

export type YouTubeStatus =
  | { state: 'not_configured'; missing: string[] }
  | { state: 'needs_auth' }
  | { state: 'needs_playlist'; account: string }
  | { state: 'connected'; account: string; playlist: { id: string; title: string } }

async function api<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const response = await googleFetch(`${API}/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) throw new ReconnectRequired()
  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string }
  } | null
  if (!response.ok) throw new Error(data?.error?.message || `YouTube returned ${response.status}`)
  return data as T
}

const session = (userId: string) =>
  oauthSession<YouTubeSecret>(userId, 'youtube', refreshGoogleToken)

/** Saves a fresh Google grant (from the OAuth callback), keeping any chosen playlist. */
export async function connectYouTube(userId: string, grant: TokenGrant) {
  const channels = await api<{ items?: { snippet?: { title?: string } }[] }>(
    grant.access_token,
    'channels',
    { part: 'snippet', mine: 'true' },
  )
  const previous = await getConnection<YouTubeSecret>(userId, 'youtube')
  await saveConnection(userId, 'youtube', {
    provider: 'youtube',
    account: channels.items?.[0]?.snippet?.title || 'YouTube account',
    secret: {
      accessToken: grant.access_token,
      refreshToken: grant.refresh_token ?? previous?.secret.refreshToken ?? '',
      expiresAt: Date.now() + grant.expires_in * 1000,
      playlistId: previous?.secret.playlistId ?? null,
      playlistTitle: previous?.secret.playlistTitle ?? null,
    } satisfies YouTubeSecret,
  })
}

/**
 * Forgets the stored sign-in. The grant is not revoked at Google because revoking it would
 * also cut off a Gmail mailbox connected with the same Google account.
 */
export const disconnectYouTube = (userId: string) => deleteConnection(userId, 'youtube')

export async function youtubeStatus(userId: string): Promise<YouTubeStatus> {
  const missing = googleMissing()
  if (missing.length) return { state: 'not_configured', missing }
  const connection = await getConnection<YouTubeSecret>(userId, 'youtube')
  if (!connection) return { state: 'needs_auth' }
  const { playlistId, playlistTitle } = connection.secret
  if (!playlistId) return { state: 'needs_playlist', account: connection.account }
  return {
    state: 'connected',
    account: connection.account,
    playlist: { id: playlistId, title: playlistTitle ?? 'Playlist' },
  }
}

export async function listPlaylists(userId: string): Promise<YouTubePlaylist[]> {
  const { token } = await session(userId)
  const data = await api<{
    items?: { id: string; snippet?: { title?: string }; contentDetails?: { itemCount?: number } }[]
  }>(token, 'playlists', { part: 'snippet,contentDetails', mine: 'true', maxResults: '50' })
  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.snippet?.title || 'Untitled playlist',
    count: item.contentDetails?.itemCount ?? 0,
  }))
}

export async function choosePlaylist(userId: string, playlistId: string) {
  const playlist = (await listPlaylists(userId)).find((item) => item.id === playlistId)
  if (!playlist) throw new Error('That playlist is not on your YouTube account.')
  const connection = await session(userId)
  await saveConnection(userId, 'youtube', {
    ...connection,
    secret: { ...connection.secret, playlistId: playlist.id, playlistTitle: playlist.title },
  })
}

type PlaylistItem = {
  snippet?: {
    title?: string
    publishedAt?: string
    videoOwnerChannelTitle?: string
    thumbnails?: Record<string, { url?: string }>
    resourceId?: { videoId?: string }
  }
}

/** Videos in the chosen playlist, most recently added first. */
export async function listVideos(userId: string): Promise<YouTubeVideo[]> {
  const { secret: stored, token } = await session(userId)
  if (!stored.playlistId) return []
  const items: PlaylistItem[] = []
  let pageToken = ''
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await api<{ items?: PlaylistItem[]; nextPageToken?: string }>(
      token,
      'playlistItems',
      {
        part: 'snippet',
        playlistId: stored.playlistId,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      },
    )
    items.push(...(data.items ?? []))
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return (
    items
      // Deleted and private videos keep a placeholder entry without an owner.
      .filter((item) => item.snippet?.resourceId?.videoId && item.snippet.videoOwnerChannelTitle)
      .map((item) => {
        const snippet = item.snippet!
        const id = snippet.resourceId!.videoId!
        const thumbs = snippet.thumbnails ?? {}
        return {
          id,
          title: snippet.title || 'Untitled video',
          channel: snippet.videoOwnerChannelTitle ?? '',
          thumbnail: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? null,
          addedAt: snippet.publishedAt ?? '',
          url: `https://www.youtube.com/watch?v=${id}&list=${stored.playlistId}`,
        }
      })
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  )
}

export function youtubeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'YouTube request failed.'
}
