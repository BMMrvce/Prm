'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/** Someone else with the note open right now. */
export type Peer = {
  id: string
  name: string
  color: string
  /** The block (paragraph) they are editing, if any. */
  block: string | null
}

/** [block id, block HTML] in document order. */
export type Blocks = [string, string][]

export type NoteMeta = { title?: string }

/** Distinct, theme-neutral colors for collaborators' cursors and avatars. */
const PEER_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#d6336c', '#0c8599', '#f08c00']

export function peerColor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PEER_COLORS[hash % PEER_COLORS.length]
}

/**
 * Real-time collaboration on one note over a private Supabase Realtime channel
 * (`note:<id>`, which only the owner and collaborators may join):
 * - presence: who has it open and which block each person is editing;
 * - broadcast: the note's blocks as people type, and title changes;
 * - database changes: saved versions, as a fallback if a live message was missed.
 * A newcomer is sent the current blocks by everyone already there.
 */
export function useNoteLive({
  noteId,
  enabled,
  me,
  onBlocks,
  onMeta,
  onSaved,
  currentBlocks,
}: {
  noteId: string
  enabled: boolean
  me: { id: string; name: string } | null
  /** A collaborator's latest blocks. */
  onBlocks: (blocks: Blocks) => void
  onMeta: (meta: NoteMeta) => void
  /** A saved row from the database (someone's autosave). */
  onSaved: (row: { content?: string; title?: string; updated_at?: string }) => void
  /** This browser's current blocks, sent to people who join. */
  currentBlocks: () => Blocks
}) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [connected, setConnected] = useState(false)
  const channel = useRef<RealtimeChannel | null>(null)
  const handlers = useRef({ onBlocks, onMeta, onSaved, currentBlocks })
  useEffect(() => {
    handlers.current = { onBlocks, onMeta, onSaved, currentBlocks }
  })
  const activity = useRef<{ block: string | null }>({ block: null })
  const sendTimer = useRef<number | undefined>(undefined)
  const trackTimer = useRef<number | undefined>(undefined)
  const myId = me?.id
  const myName = me?.name

  useEffect(() => {
    if (!enabled || !myId) return
    const supabase = createClient()
    let live: RealtimeChannel | null = null
    let cancelled = false

    const sendBlocks = () =>
      live?.send({
        type: 'broadcast',
        event: 'blocks',
        payload: { from: myId, blocks: handlers.current.currentBlocks() },
      })

    void (async () => {
      // Private channels authorize with the signed-in user's token.
      await supabase.realtime.setAuth()
      if (cancelled) return
      live = supabase
        .channel(`note:${noteId}`, {
          config: { private: true, broadcast: { self: false }, presence: { key: myId } },
        })
        .on('broadcast', { event: 'blocks' }, ({ payload }) => {
          if (payload?.from !== myId && Array.isArray(payload?.blocks)) {
            handlers.current.onBlocks(payload.blocks as Blocks)
          }
        })
        .on('broadcast', { event: 'meta' }, ({ payload }) => {
          if (payload?.from !== myId) handlers.current.onMeta(payload.meta as NoteMeta)
        })
        .on('presence', { event: 'sync' }, () => {
          const state = live?.presenceState<{ name: string; block: string | null }>() ?? {}
          setPeers(
            Object.entries(state)
              .filter(([key]) => key !== myId)
              .map(([key, entries]) => ({
                id: key,
                name: entries[0]?.name ?? 'Someone',
                block: entries[0]?.block ?? null,
                color: peerColor(key),
              })),
          )
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          // Bring the newcomer up to date, including edits not saved yet.
          if (key !== myId) window.setTimeout(() => void sendBlocks(), 150)
        })
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notes', filter: `id=eq.${noteId}` },
          (change) => handlers.current.onSaved(change.new as { content?: string; title?: string }),
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true)
            await live?.track({ name: myName ?? 'Someone', block: activity.current.block })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnected(false)
          }
        })
      channel.current = live
    })()

    return () => {
      cancelled = true
      window.clearTimeout(sendTimer.current)
      window.clearTimeout(trackTimer.current)
      setConnected(false)
      setPeers([])
      channel.current = null
      if (live) void supabase.removeChannel(live)
    }
  }, [noteId, enabled, myId, myName])

  return {
    peers,
    connected,
    /** Sends this browser's blocks (throttled to every ~120 ms while typing). */
    sendBlocks: () => {
      if (!channel.current || sendTimer.current) return
      sendTimer.current = window.setTimeout(() => {
        sendTimer.current = undefined
        void channel.current?.send({
          type: 'broadcast',
          event: 'blocks',
          payload: { from: myId, blocks: handlers.current.currentBlocks() },
        })
      }, 120)
    },
    sendMeta: (meta: NoteMeta) =>
      void channel.current?.send({
        type: 'broadcast',
        event: 'meta',
        payload: { from: myId, meta },
      }),
    /** Shares which block you are in (throttled), so others see where you are editing. */
    setActiveBlock: (block: string | null) => {
      if (activity.current.block === block) return
      activity.current.block = block
      window.clearTimeout(trackTimer.current)
      trackTimer.current = window.setTimeout(
        () => void channel.current?.track({ name: myName ?? 'Someone', block }),
        250,
      )
    },
  }
}
