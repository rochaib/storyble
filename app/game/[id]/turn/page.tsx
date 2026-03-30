'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'
import { SentenceCard } from '@/components/game/SentenceCard'
import { TurnForm } from '@/components/game/TurnForm'

type TurnData = {
  previous_sentence: string
  round: number
  total_rounds: number
}

export default function TurnPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [turnData, setTurnData] = useState<TurnData | null>(null)
  const [error, setError] = useState('')
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPlayerId(localStorage.getItem('fold_player_id'))
    }
  }, [])

  useEffect(() => {
    if (!playerId) return
    fetch(`/api/games/${id}/turn?player_id=${playerId}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) setError(data.error ?? 'Could not load turn')
        else setTurnData(data as TurnData)
      })
      .catch(err => {
        console.error('Turn fetch failed:', err)
        setError('Could not load turn')
      })
  }, [id, playerId])

  if (error) {
    return (
      <main className="max-w-sm mx-auto px-6 py-8">
        <TopBar />
        <div className="mt-8 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={() => router.push(`/game/${id}/waiting`)} className="mt-4 text-[#e94560] text-sm underline">
            Back to waiting
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-8">
      <TopBar />
      {turnData && playerId ? (
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 uppercase tracking-widest">
              Round {turnData.round} of {turnData.total_rounds}
            </span>
            <span className="text-xs text-[#e94560]">Your turn</span>
          </div>
          <SentenceCard sentence={turnData.previous_sentence} />
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <TurnForm
              gameId={id}
              playerId={playerId}
              onSubmitted={() => router.push(`/game/${id}/waiting`)}
            />
          </div>
        </div>
      ) : (
        !error && <p className="text-slate-400 text-center mt-16">Loading…</p>
      )}
    </main>
  )
}
