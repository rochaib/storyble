'use client'
import { useEffect, useCallback, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'
import type { GamePollResponse } from '@/types'

export default function WaitingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<GamePollResponse | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('fold_player_id')
      if (!stored) { router.replace('/'); return }
      setPlayerId(stored)
    }
  }, [router])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${id}`)
      if (!res.ok) return
      const json: GamePollResponse = await res.json()
      setData(json)

      if (json.game.status === 'complete') {
        router.push(`/game/${id}/reveal`)
        return
      }
      if (json.game.status === 'closed') {
        router.replace('/')
        return
      }
      if (json.game.status === 'locked') return
      if (playerId && json.current_player_id === playerId) {
        router.push(`/game/${id}/turn`)
      }
    } catch (err) {
      console.error('Waiting poll failed:', err)
    }
  }, [id, playerId, router])

  useEffect(() => {
    if (playerId === null) return
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [poll, playerId])

  const currentPlayer = data?.players.find(p => p.id === data.current_player_id)
  const isCreator = data?.players.find(p => p.join_order === 1)?.id === playerId

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

  return (
    <main className="max-w-sm mx-auto px-6 py-8">
      <TopBar />
      <div className="flex flex-col items-center gap-6 mt-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#0f3460] flex items-center justify-center animate-pulse">
          <span className="text-2xl">✏️</span>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {currentPlayer ? (
              <><span className="font-semibold text-slate-800 dark:text-white">{currentPlayer.nickname}</span> is writing…</>
            ) : 'Waiting for next turn…'}
          </p>
          {data && (
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">
              Round {data.game.current_round} of {data.game.total_rounds}
            </p>
          )}
        </div>
        {isCreator && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="text-slate-400 dark:text-slate-500 text-xs underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40 mt-4"
          >
            {closing ? 'Ending game…' : 'End game early'}
          </button>
        )}
      </div>
    </main>
  )
}
