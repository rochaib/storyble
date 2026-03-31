import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { rateLimits } from '@/lib/ratelimit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimits.pollGame.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const [game] = await sql`
    SELECT g.id, g.status, g.opening_line, g.total_rounds,
           g.current_round, g.created_at, g.timeout_hours,
           COUNT(p.id)::int AS player_count
    FROM games g
    LEFT JOIN players p ON p.game_id = g.id
    WHERE g.id = ${id}
    GROUP BY g.id
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  // Lobby expiry check
  if (game.status === 'lobby') {
    const ageMinutes = (Date.now() - new Date(game.created_at).getTime()) / 60000
    if (ageMinutes > 5 && game.player_count < 2) {
      await sql`DELETE FROM games WHERE id = ${id}`
      return NextResponse.json({ error: 'Game expired' }, { status: 404 })
    }
  }

  const players = await sql`
    SELECT id, nickname, join_order, is_active
    FROM players WHERE game_id = ${id}
    ORDER BY join_order
  `

  const activePlayers = players.filter((p: Record<string, unknown>) => p['is_active'])
  const currentPlayerIndex = game.current_round % (activePlayers.length || 1)
  const currentPlayerId = activePlayers[currentPlayerIndex]?.id ?? null

  return NextResponse.json({
    game: {
      id: game.id,
      status: game.status,
      total_rounds: game.total_rounds,
      current_round: game.current_round,
    },
    players,
    current_player_id: currentPlayerId,
  })
}
