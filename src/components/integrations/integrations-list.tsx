'use client'

import { Calendar, GitBranch, ListVideo, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { connectYouTubeUrl, useYouTube } from '@/components/youtube/watch-later-panel'
import { workspacePath } from '@/lib/routes'
import { MailConnection } from './mail-connection'
import { useToast, useWorkspace } from '@/state/workbench-store'

/** Integrations that have no server-side implementation yet; listed with the env vars they need. */
const upcoming: [string, string, ReactNode, string][] = [
  ['Google Calendar', 'Two-way calendar sync', <Calendar size={19} key="c" />, 'GOOGLE_CLIENT_ID'],
  ['Slack', 'Mentions and task creation', <MessageSquare size={19} key="s" />, 'SLACK_CLIENT_ID'],
  ['GitHub', 'Pull requests and status', <GitBranch size={19} key="g" />, 'GITHUB_CLIENT_ID'],
]

export function IntegrationsList() {
  const { workspace } = useWorkspace()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const youtube = useYouTube()

  const disconnectYouTube = async () => {
    setBusy(true)
    await fetch('/api/youtube', { method: 'DELETE' })
    await youtube.load()
    setBusy(false)
    showToast('YouTube disconnected.')
  }

  const youtubeStatus = youtube.feed?.status
  const youtubeBadge =
    youtubeStatus?.state === 'connected'
      ? ['Connected', 'bg-[#e6f7ea] text-[#2f7045]']
      : youtubeStatus?.state === 'needs_playlist'
        ? ['Pick a playlist', 'bg-[#fff4cf] text-[#8a6100]']
        : youtubeStatus?.state === 'needs_auth'
          ? ['Not connected', 'bg-[#eeeeef] text-[#66666c]']
          : ['Not configured', 'bg-[#eeeeef] text-[#66666c]']

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <MailConnection space={workspace.key} />
        <div className="neo-card flex min-w-0 flex-wrap items-center gap-4 rounded-xl p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#fdecec] text-[#c4302b]">
            <ListVideo size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">YouTube</h3>
              {youtubeStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${youtubeBadge[1]}`}
                >
                  {youtubeBadge[0]}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-[#77777d]">
              {!youtubeStatus
                ? 'Checking…'
                : youtubeStatus.state === 'connected'
                  ? `${youtubeStatus.playlist.title} · ${youtubeStatus.account}`
                  : youtubeStatus.state === 'needs_playlist'
                    ? youtubeStatus.account
                    : youtubeStatus.state === 'needs_auth'
                      ? 'A playlist of yours on the Personal dashboard'
                      : `Needs ${youtubeStatus.missing.join(', ')}`}
            </p>
          </div>
          {youtubeStatus?.state === 'needs_auth' && (
            <a
              href={connectYouTubeUrl(workspacePath('personal'))}
              className="rounded-lg bg-[#c4302b] px-3 py-2 text-xs font-medium text-white"
            >
              Connect
            </a>
          )}
          {(youtubeStatus?.state === 'connected' || youtubeStatus?.state === 'needs_playlist') && (
            <div className="flex gap-2">
              <Link
                href={workspacePath('personal')}
                className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium"
              >
                {youtubeStatus.state === 'connected' ? 'Open dashboard' : 'Pick playlist'}
              </Link>
              <button
                type="button"
                onClick={() => void disconnectYouTube()}
                disabled={busy}
                className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium text-[#a52828] disabled:opacity-60"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
        {upcoming.map(([name, detail, icon, envVar]) => (
          <div className="neo-card flex min-w-0 items-center gap-4 rounded-xl p-5" key={name}>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f2f2f4] text-[#77777d]">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{name}</h3>
              <p className="mt-1 text-xs text-[#77777d]">{detail}</p>
            </div>
            <span
              className="shrink-0 rounded-full bg-[#eeeeef] px-2 py-1 text-[10px] font-medium text-[#66666c]"
              title={`Needs ${envVar} and a server integration`}
            >
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
