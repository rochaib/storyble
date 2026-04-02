import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const statusFilter = searchParams.get('status')
  const query = searchParams.get('q')?.trim()

  // Build the games query
  // If a specific status filter was requested, use it directly (even if it returns nothing)
  // If no filter, default to non-expired statuses
  const defaultStatuses = ['lobby', 'active', 'complete', 'archived', 'locked']
  const statusesToShow = statusFilter ? [statusFilter] : defaultStatuses

  let games
  if (query) {
    // Search by player nickname
    games = await sql`
      SELECT DISTINCT g.id, g.status, g.total_rounds, g.current_round,
             g.created_at, g.timeout_minutes
      FROM games g
      JOIN players p ON p.game_id = g.id
      WHERE g.status = ANY(${statusesToShow}::text[])
        AND p.nickname ILIKE ${'%' + query + '%'}
      ORDER BY g.created_at DESC
      LIMIT 100
    `
  } else {
    games = await sql`
      SELECT g.id, g.status, g.total_rounds, g.current_round,
             g.created_at, g.timeout_minutes
      FROM games g
      WHERE g.status = ANY(${statusesToShow}::text[])
      ORDER BY g.created_at DESC
      LIMIT 100
    `
  }

  // Fetch players for each game
  const gameIds = games.map((g: Record<string, unknown>) => g.id as string)
  const players = gameIds.length > 0
    ? await sql`
        SELECT id, game_id, nickname, join_order, is_active
        FROM players
        WHERE game_id = ANY(${gameIds}::uuid[])
        ORDER BY join_order
      `
    : []

  // Group players by game_id
  type PlayerRow = { id: string; game_id: string; nickname: string; join_order: number; is_active: boolean }
  const playersByGame = (players as PlayerRow[]).reduce((acc: Record<string, PlayerRow[]>, p: PlayerRow) => {
    if (!acc[p.game_id]) acc[p.game_id] = []
    acc[p.game_id].push(p)
    return acc
  }, {})

  type GameRow = { id: string; status: string; total_rounds: number; current_round: number; created_at: string; timeout_minutes: number }
  const result = (games as GameRow[]).map((g: GameRow) => ({
    id: g.id,
    status: g.status,
    total_rounds: g.total_rounds,
    current_round: g.current_round,
    created_at: g.created_at,
    timeout_minutes: g.timeout_minutes,
    players: playersByGame[g.id] ?? [],
  }))

  return NextResponse.json({ games: result })
}
