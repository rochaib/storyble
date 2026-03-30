'use client'
import { useState } from 'react'

type Props = {
  gameId: string
  playerId: string
  onSubmitted: () => void
}

export function TurnForm({ gameId, playerId, onSubmitted }: Props) {
  const [sentence, setSentence] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sentence.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/turns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId, sentence: sentence.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to submit'); return }
      onSubmitted()
    } catch (err) {
      console.error('TurnForm submit failed:', err)
      setError('Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest">Continue the story…</p>
      <textarea
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        placeholder="Write your sentence here…"
        rows={4}
        maxLength={500}
        className="w-full py-3 px-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#111827] text-slate-800 dark:text-white italic text-sm resize-none outline-none focus:border-[#e94560]"
      />
      {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={!sentence.trim() || loading}
        className="self-end py-2 px-6 rounded-lg bg-[#e94560] text-white font-bold text-sm hover:bg-[#c73652] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Submitting…' : 'Fold & Pass ➜'}
      </button>
    </form>
  )
}
