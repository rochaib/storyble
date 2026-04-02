'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'
import { RoundsInput } from '@/components/ui/RoundsInput'

export default function CreatePage() {
  const router = useRouter()
  const [openingLine, setOpeningLine] = useState('')
  const [rounds, setRounds] = useState(5)
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!openingLine.trim() || !nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      // Create the game
      const createRes = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_line: openingLine.trim(),
          total_rounds: rounds,
          timeout_minutes: timeoutMinutes,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) { setError(createData.error ?? 'Could not create game'); return }

      // Auto-join as creator
      const joinRes = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: createData.code, nickname: nickname.trim() }),
      })
      const joinData = await joinRes.json()
      if (!joinRes.ok) { setError(joinData.error ?? 'Could not join game'); return }

      const { player_id, game_id } = joinData as { player_id?: string; game_id?: string }
      if (!player_id || !game_id) { setError('Unexpected server response'); return }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fold_player_id', player_id)
        sessionStorage.setItem('fold_game_code', createData.code)
      }
      router.push(`/game/${game_id}/lobby`)
    } catch (err) {
      console.error('handleCreate failed:', err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-8">
      <TopBar />
      <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-6">New Game</h1>
      <form onSubmit={handleCreate} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your nickname
          </label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. Alex"
            maxLength={20}
            className="w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0f3460] text-slate-800 dark:text-white text-sm outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Opening sentence
          </label>
          <textarea
            value={openingLine}
            onChange={e => setOpeningLine(e.target.value)}
            placeholder="It was a perfectly ordinary Tuesday…"
            rows={3}
            maxLength={500}
            className="w-full py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0f3460] text-slate-800 dark:text-white text-sm resize-none outline-none italic"
          />
        </div>
        <RoundsInput value={rounds} onChange={setRounds} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Turn time limit
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '5m', value: 5 },
              { label: '15m', value: 15 },
              { label: '30m', value: 30 },
              { label: '1h', value: 60 },
              { label: '24h', value: 1440 },
              { label: 'None', value: null },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setTimeoutMinutes(opt.value)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeoutMinutes === opt.value
                    ? 'bg-[#e94560] text-white'
                    : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={!openingLine.trim() || !nickname.trim() || loading}
          className="py-3 rounded-lg bg-[#e94560] text-white font-bold hover:bg-[#c73652] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating…' : 'Create Game'}
        </button>
      </form>
    </main>
  )
}
