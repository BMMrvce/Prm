'use client'

import { ListVideo, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { mailDate } from '@/lib/format'
import type { YouTubePlaylist, YouTubeStatus, YouTubeVideo } from '@/lib/youtube'
import { useToast } from '@/state/workbench-store'

const COLLAPSED = 8

type Feed = { status: YouTubeStatus; videos: YouTubeVideo[]; error?: string }

/** Load / connect / disconnect helpers shared by the dashboard card and Integrations. */
export function useYouTube() {
  const [feed, setFeed] = useState<Feed | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/youtube', { cache: 'no-store' })
      setFeed((await response.json()) as Feed)
    } catch {
      setFeed((current) => current && { ...current, error: 'Could not reach YouTube.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { feed, loading, load }
}

export const connectYouTubeUrl = (next: string) =>
  `/api/oauth/google/connect?purpose=youtube&next=${encodeURIComponent(next)}`

/** Videos from the YouTube playlist the user picked as their "watch later" list. */
export function WatchLaterPanel() {
  const { showToast } = useToast()
  const { feed, loading, load } = useYouTube()
  const [playlists, setPlaylists] = useState<YouTubePlaylist[] | null>(null)
  const [choice, setChoice] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const state = feed?.status.state
  const connected = feed?.status.state === 'connected' ? feed.status : null

  // Result of the Google sign-in redirect (?youtube=connected|error&message=…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('youtube')
    if (!result) return
    showToast(
      result === 'connected'
        ? 'YouTube connected. Pick the playlist to show.'
        : `YouTube sign-in failed: ${params.get('message') ?? 'unknown error'}`,
      5000,
    )
    params.delete('youtube')
    params.delete('message')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [showToast])

  useEffect(() => {
    if (state !== 'needs_playlist' && !choosing) return
    let cancelled = false
    void (async () => {
      const response = await fetch('/api/youtube/playlists', { cache: 'no-store' })
      const data = (await response.json()) as { playlists?: YouTubePlaylist[]; error?: string }
      if (cancelled) return
      if (data.error) showToast(data.error, 4500)
      const list = data.playlists ?? []
      setPlaylists(list)
      setChoice(
        (current) =>
          current || (list.find((item) => /later/i.test(item.title)) ?? list[0])?.id || '',
      )
    })()
    return () => {
      cancelled = true
    }
  }, [choosing, showToast, state])

  const save = async () => {
    if (!choice) return
    const response = await fetch('/api/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: choice }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      showToast(data.error ?? 'Could not save the playlist.', 4500)
      return
    }
    setChoosing(false)
    await load()
  }

  const videos = feed?.videos ?? []
  const shown = expanded ? videos : videos.slice(0, COLLAPSED)
  const picker = state === 'needs_playlist' || choosing

  return (
    <section className="neo-card mt-[15px] min-w-0 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-[#fdecec] text-[#c4302b]">
          <ListVideo size={17} />
        </span>
        <div className="mr-auto min-w-0">
          <h2 className="text-[15px] font-semibold">Watch Later</h2>
          <p className="truncate text-[12px] text-[#73737a]">
            {connected
              ? `${connected.playlist.title} · ${videos.length} videos · ${connected.account}`
              : 'Videos you save to a YouTube playlist'}
          </p>
        </div>
        {state === 'connected' && !choosing && (
          <>
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className="h-8 rounded-lg border border-[#d8d8dc] bg-white px-3 text-[12px]"
            >
              Change playlist
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="grid size-8 place-items-center rounded-lg border border-[#d8d8dc] bg-white text-[#55555c] disabled:opacity-50"
              aria-label="Refresh videos"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </>
        )}
      </div>

      {!feed && <p className="mt-4 text-[13px] text-[#88888e]">Loading…</p>}

      {feed?.status.state === 'not_configured' && (
        <p className="mt-4 text-[13px] text-[#55555c]">
          Add a Google OAuth client to <code className="text-[12px]">.env</code> (
          {feed.status.missing.join(', ')}) to connect YouTube. See the README for the steps.
        </p>
      )}

      {state === 'needs_auth' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-[13px] text-[#55555c]">
            Connect your Google account, then pick a playlist (for example one called
            &ldquo;Later&rdquo;). YouTube&rsquo;s own Watch later list can&rsquo;t be read by apps.
          </p>
          <a
            href={connectYouTubeUrl(window.location.pathname)}
            className="h-9 rounded-lg bg-[#c4302b] px-4 text-[13px] font-medium leading-9 text-white"
          >
            Connect YouTube
          </a>
        </div>
      )}

      {picker && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {playlists === null ? (
            <p className="text-[13px] text-[#88888e]">Loading your playlists…</p>
          ) : playlists.length ? (
            <>
              <select
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                className="h-9 min-w-0 max-w-full flex-1 rounded-lg border border-[#d8d8dc] bg-white px-2 text-[13px] sm:max-w-sm"
                aria-label="Playlist"
              >
                {playlists.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.count})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void save()}
                className="h-9 rounded-lg bg-[#493bd0] px-4 text-[13px] font-medium text-white"
              >
                Show this playlist
              </button>
              {choosing && (
                <button
                  type="button"
                  onClick={() => setChoosing(false)}
                  className="h-9 rounded-lg px-3 text-[13px] text-[#55555c]"
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#55555c]">
              No playlists on this YouTube account yet. Create one (e.g. &ldquo;Later&rdquo;) on
              YouTube, save a video to it, then reload.
            </p>
          )}
        </div>
      )}

      {state === 'connected' && !choosing && (
        <>
          {feed?.error && <p className="mt-4 text-[13px] text-[#a52828]">{feed.error}</p>}
          {!videos.length && !feed?.error && (
            <p className="mt-4 text-[13px] text-[#88888e]">
              This playlist is empty. Save a video to it on YouTube and press refresh.
            </p>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((video) => (
              <li key={video.id} className="min-w-0">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]"
                >
                  <div className="aspect-video overflow-hidden rounded-lg bg-[#eeeeef]">
                    {video.thumbnail && (
                      // Remote YouTube thumbnails; next/image would need a remote-patterns config.
                      <img
                        src={video.thumbnail}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-[18px] text-[#222226] group-hover:text-[#493bd0]">
                    {video.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#77777d]">
                    {video.channel}
                    {video.addedAt && ` · added ${mailDate(video.addedAt)}`}
                  </p>
                </a>
              </li>
            ))}
          </ul>
          {videos.length > COLLAPSED && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 text-[12px] font-medium text-[#493bd0]"
            >
              {expanded ? 'Show fewer' : `Show all ${videos.length} videos`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
