'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'

type GameDetail = {
  game: {
    id: string
    status: string
    opening_line: string
    total_rounds: number
    current_round: number
    timeout_hours: number | null
    created_at: string
  }
  players: Array<{
    id: string
    nickname: string
    join_order: number
    is_active: boolean
  }>
  turns: Array<{
    round_number: number
    sentence: string
    submitted_at: string
    nickname: string
  }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

export default function AdminGameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/admin/api/games/${id}/view`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) setError(data.error ?? 'Not found')
        else setDetail(data as GameDetail)
      })
      .catch(err => {
        console.error('Game detail fetch failed:', err)
        setError('Could not load game')
      })
  }, [id])

  if (error) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-8">
        <TopBar />
        <p className="text-red-500 text-center mt-16">{error}</p>
        <div className="text-center mt-4">
          <button onClick={() => router.push('/admin')} className="text-[#e94560] text-sm underline">
            ← Back to dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <TopBar
        right={
          <button
            onClick={() => router.push('/admin')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Dashboard
          </button>
        }
      />

      {detail ? (
        <div className="flex flex-col gap-6">
          {/* Game metadata */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-lg font-bold text-slate-800">Game Detail</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                {detail.game.status}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Opening line</dt>
                <dd className="text-slate-700 italic">&ldquo;{detail.game.opening_line}&rdquo;</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Rounds</dt>
                <dd className="text-slate-700">{detail.game.current_round} / {detail.game.total_rounds}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Created</dt>
                <dd className="text-slate-700">{formatDate(detail.game.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Turn timeout</dt>
                <dd className="text-slate-700">{detail.game.timeout_hours ? `${detail.game.timeout_hours}h` : 'None'}</dd>
              </div>
            </dl>
          </div>

          {/* Players */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Players</h2>
            <ul className="flex flex-col gap-2">
              {detail.players.map(p => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400 w-4 text-xs">{p.join_order}.</span>
                  <span className={p.is_active ? 'text-slate-700' : 'text-slate-400 line-through'}>
                    {p.nickname}
                  </span>
                  {!p.is_active && <span className="text-xs text-slate-400">(timed out)</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Turn history */}
          {detail.turns.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Turn History</h2>
              <div className="flex flex-col gap-3">
                {detail.turns.map(turn => (
                  <div key={turn.round_number} className="border-l-2 border-slate-200 pl-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs text-slate-400">Round {turn.round_number} — {turn.nickname}</span>
                      <span className="text-xs text-slate-300">{formatDate(turn.submitted_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">&ldquo;{turn.sentence}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate-400 text-center mt-16">Loading…</p>
      )}
    </main>
  )
}
