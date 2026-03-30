'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'

type KpiData = {
  active_games: number
  daily_players: number
  weekly_players: number
  nps_score: number | null
  nps_total: number
}

type Player = {
  id: string
  nickname: string
  join_order: number
  is_active: boolean
}

type Game = {
  id: string
  status: 'lobby' | 'active' | 'complete' | 'archived' | 'locked'
  total_rounds: number
  current_round: number
  created_at: string
  players: Player[]
}

const STATUS_COLORS: Record<Game['status'], string> = {
  lobby:    'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100 text-green-700',
  locked:   'bg-orange-100 text-orange-700',
  complete: 'bg-purple-100 text-purple-700',
  archived: 'bg-slate-100 text-slate-500',
}

const FILTER_TABS = ['all', 'lobby', 'active', 'complete', 'archived'] as const
type FilterTab = typeof FILTER_TABS[number]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [kpiRes, gamesRes] = await Promise.all([
        fetch('/admin/api/dashboard'),
        fetch(`/admin/api/games${filter !== 'all' ? `?status=${filter}` : ''}${searchQuery ? `${filter !== 'all' ? '&' : '?'}q=${encodeURIComponent(searchQuery)}` : ''}`),
      ])
      if (kpiRes.ok) setKpis(await kpiRes.json())
      if (gamesRes.ok) {
        const data = await gamesRes.json()
        setGames(data.games ?? [])
      }
    } catch (err) {
      console.error('Admin fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, searchQuery])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAction(gameId: string, action: string) {
    setActionLoading(`${gameId}-${action}`)
    try {
      const res = await fetch(`/admin/api/games/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Action failed')
        return
      }
      await fetchData()
    } catch (err) {
      console.error('Action failed:', err)
      alert('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearchQuery(search)
  }

  async function handleSignOut() {
    await fetch('/admin/api/logout', { method: 'POST' }).catch(() => {})
    router.push('/admin/login')
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <TopBar
        right={
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-400 border border-slate-200 px-3 py-1.5 rounded hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Games', value: kpis?.active_games ?? '—' },
          { label: 'Daily Players', value: kpis?.daily_players ?? '—' },
          { label: 'Weekly Players', value: kpis?.weekly_players ?? '—' },
          {
            label: 'NPS Score',
            value: kpis?.nps_score != null ? `+${kpis.nps_score}` : '—',
            sub: kpis?.nps_total ? `${kpis.nps_total} responses` : undefined,
          },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{card.label}</p>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            {card.sub && <p className="text-xs text-slate-400 mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                filter === tab
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by player nickname…"
            className="flex-1 min-w-0 py-1.5 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 outline-none"
          />
          <button type="submit" className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchQuery('') }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Game Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[80px_1fr_90px_80px_90px_160px] gap-0 bg-slate-50 px-4 py-2 border-b border-slate-200">
          {['Code', 'Players', 'Rounds', 'Status', 'Created', 'Actions'].map(h => (
            <div key={h} className="text-xs text-slate-400 uppercase tracking-wider">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No games found</div>
        ) : (
          games.map(game => {
            const nicknames = game.players.map(p => p.nickname).join(', ')
            const isActing = actionLoading?.startsWith(game.id)

            return (
              <div
                key={game.id}
                className="grid grid-cols-[80px_1fr_90px_80px_90px_160px] gap-0 px-4 py-3 border-b border-slate-100 items-center last:border-0"
              >
                {/* Code (masked) */}
                <div className="font-mono text-slate-800 text-xs font-bold tracking-widest">
                  ••••••
                </div>

                {/* Players */}
                <div className="text-slate-600 text-xs truncate pr-2">
                  {nicknames || '—'}
                </div>

                {/* Rounds */}
                <div className="text-slate-500 text-xs">
                  {game.current_round} / {game.total_rounds}
                </div>

                {/* Status badge */}
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[game.status]}`}>
                    {game.status}
                  </span>
                </div>

                {/* Created */}
                <div className="text-slate-400 text-xs">{timeAgo(game.created_at)}</div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1">
                  {/* View (always available) */}
                  <button
                    onClick={() => router.push(`/admin/game/${game.id}`)}
                    disabled={isActing}
                    className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                  >
                    View
                  </button>

                  {/* Story (complete + archived) */}
                  {(game.status === 'complete' || game.status === 'archived') && (
                    <button
                      onClick={() => router.push(`/admin/game/${game.id}/story`)}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                    >
                      Story
                    </button>
                  )}

                  {/* Lock (active only) */}
                  {game.status === 'active' && (
                    <button
                      onClick={() => handleAction(game.id, 'lock')}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors"
                    >
                      Lock
                    </button>
                  )}

                  {/* Unlock (locked only) */}
                  {game.status === 'locked' && (
                    <button
                      onClick={() => handleAction(game.id, 'unlock')}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 transition-colors"
                    >
                      Unlock
                    </button>
                  )}

                  {/* End (active + locked) */}
                  {(game.status === 'active' || game.status === 'locked') && (
                    <button
                      onClick={() => handleAction(game.id, 'end')}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 transition-colors"
                    >
                      End
                    </button>
                  )}

                  {/* Discard (lobby only) */}
                  {game.status === 'lobby' && (
                    <button
                      onClick={() => handleAction(game.id, 'discard')}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 transition-colors"
                    >
                      Discard
                    </button>
                  )}

                  {/* Archive (complete only) */}
                  {game.status === 'complete' && (
                    <button
                      onClick={() => handleAction(game.id, 'archive')}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                    >
                      Archive
                    </button>
                  )}

                  {/* Delete (complete + archived) */}
                  {(game.status === 'complete' || game.status === 'archived') && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this game and all its data? This cannot be undone.')) {
                          handleAction(game.id, 'delete')
                        }
                      }}
                      disabled={isActing}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && games.length > 0 && (
        <p className="text-center text-xs text-slate-400 mt-4">
          Join codes shown as •••••• — hashed at rest, not retrievable.
        </p>
      )}
    </main>
  )
}
