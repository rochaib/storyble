import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const playerId = request.nextUrl.searchParams.get('player_id')
  if (!playerId) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

  const [game] = await sql`
    SELECT id, status, current_round, total_rounds, opening_line
    FROM games WHERE id = ${id}
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status === 'locked') return NextResponse.json({ error: 'Game is locked' }, { status: 403 })
  if (game.status !== 'active') return NextResponse.json({ error: 'Game not active' }, { status: 409 })

  // Verify it's this player's turn
  const activePlayers = await sql`
    SELECT id FROM players
    WHERE game_id = ${id} AND is_active = true
    ORDER BY join_order
  `
  const currentIndex = (game.current_round - 1) % activePlayers.length
  if (activePlayers[currentIndex]?.id !== playerId) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  }

  // Round 1: previous sentence is the opening_line
  if (game.current_round === 1) {
    return NextResponse.json({
      previous_sentence: game.opening_line,
      round: 1,
      total_rounds: game.total_rounds,
    })
  }

  const [turn] = await sql`
    SELECT sentence FROM turns
    WHERE game_id = ${id} AND round_number = ${game.current_round - 1}
  `
  return NextResponse.json({
    previous_sentence: turn.sentence,
    round: game.current_round,
    total_rounds: game.total_rounds,
  })
}
