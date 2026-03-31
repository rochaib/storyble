'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CodeInput } from '@/components/ui/CodeInput'
import { TopBar } from '@/components/ui/TopBar'

export default function HomePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6 || !nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, nickname: nickname.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not join'); return }
      const { player_id, game_id } = data as { player_id?: string; game_id?: string }
      if (!player_id || !game_id) {
        setError('Unexpected server response')
        return
      }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fold_player_id', player_id)
      }
      router.push(`/game/${game_id}/lobby`)
    } catch (err) {
      console.error('handleJoin failed:', err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-8">
      <TopBar
        right={
          <button
            onClick={() => router.push('/create')}
            aria-label="Create new game"
            className="w-9 h-9 rounded-full bg-[#e94560] text-white text-2xl font-light flex items-center justify-center hover:bg-[#c73652] transition-colors leading-none"
          >
            +
          </button>
        }
      />
      <form onSubmit={handleJoin} className="flex flex-col items-center gap-4 mt-12">
        <p className="text-slate-400 dark:text-slate-500 text-xs tracking-widest uppercase">
          Enter game code
        </p>
        <CodeInput value={code} onChange={setCode} />
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="Your nickname"
          maxLength={20}
          className="w-48 text-center py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0f3460] text-slate-600 dark:text-slate-300 text-sm outline-none"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={code.length !== 6 || !nickname.trim() || loading}
          className="w-48 py-3 rounded-lg bg-[#e94560] text-white font-bold text-base hover:bg-[#c73652] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
        >
          {loading ? 'Joining…' : 'Join'}
        </button>
        <p className="text-slate-400 dark:text-slate-600 text-xs mt-4">Tap + to start a new game</p>
      </form>
    </main>
  )
}
