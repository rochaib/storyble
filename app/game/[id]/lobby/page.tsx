'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'
import { PlayerList } from '@/components/game/PlayerList'
import type { GamePollResponse } from '@/types'

export default function LobbyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<GamePollResponse | null>(null)
  const [expired, setExpired] = useState(false)
  const [starting, setStarting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('fold_player_id')
      if (!stored) { router.replace('/'); return }
      setPlayerId(stored)
      setGameCode(sessionStorage.getItem('fold_game_code'))
    }
  }, [router])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${id}`)
      if (res.status === 404) { setExpired(true); return }
      const json: GamePollResponse = await res.json()
      setData(json)
      if (json.game?.status === 'active') {
        router.push(`/game/${id}/waiting`)
      }
      if (json.game?.status === 'closed') {
        router.replace('/')
      }
    } catch (err) {
      console.error('Lobby poll failed:', err)
    }
  }, [id, router])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [poll])

  const isCreator = data?.players.find(p => p.join_order === 1)?.id === playerId
  const canStart = isCreator && (data?.players.length ?? 0) >= 2

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2000)
  }

  async function handleShare() {
    const url = `${window.location.origin}?code=${gameCode}`
    const text = `Join my Storyble game!\nCode: ${gameCode}\n${url}`

    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // User cancelled — ignore
      }
    } else {
      await navigator.clipboard.writeText(text)
      showToast('Copied to clipboard!')
    }
  }

  async function handleStart() {
    if (!playerId) return
    setStarting(true)
    try {
      const res = await fetch(`/api/games/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_player_id: playerId }),
      })
      if (res.ok) {
        await poll()
      }
    } catch (err) {
      console.error('Start game failed:', err)
    } finally {
      setStarting(false)
    }
  }

  async function handleClose() {
    if (!playerId) return
    setClosing(true)
    try {
      await fetch(`/api/games/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      })
      router.replace('/')
    } catch (err) {
      console.error('Close game failed:', err)
      setClosing(false)
    }
  }

  if (expired) {
    return (
      <main className="max-w-sm mx-auto px-6 py-8">
        <TopBar />
        <div className="text-center mt-16">
          <p className="text-slate-500 dark:text-slate-400">This game has expired.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-[#e94560] text-sm underline"
          >
            Go home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-8">
      <TopBar />
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Game code</p>
          <p className="text-4xl font-bold tracking-widest text-[#e94560] mb-3">
            {gameCode ?? '……'}
          </p>
          <button
            type="button"
            onClick={handleShare}
            className="px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Share invite
          </button>
          {toast && (
            <p className="text-xs text-green-500 mt-2 animate-pulse">{toast}</p>
          )}
        </div>
        <div className="w-full">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Players</p>
          <PlayerList players={data?.players ?? []} currentPlayerId={playerId ?? undefined} />
        </div>
        {isCreator ? (
          <>
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="w-full py-3 rounded-lg bg-[#e94560] text-white font-bold hover:bg-[#c73652] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {starting ? 'Starting…' : canStart ? 'Start Game' : 'Waiting for players…'}
            </button>
            <button
              onClick={handleClose}
              disabled={closing}
              className="text-slate-400 dark:text-slate-500 text-xs underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              {closing ? 'Cancelling…' : 'Cancel game'}
            </button>
          </>
        ) : (
          <p className="text-slate-400 text-sm text-center">Waiting for the creator to start…</p>
        )}
      </div>
    </main>
  )
}
