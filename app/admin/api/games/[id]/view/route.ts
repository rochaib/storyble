import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [game] = await sql`
    SELECT id, status, opening_line, total_rounds, current_round,
           timeout_hours, created_at
    FROM games WHERE id = ${id}
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const players = await sql`
    SELECT id, nickname, join_order, is_active
    FROM players WHERE game_id = ${id}
    ORDER BY join_order
  `

  const turns = await sql`
    SELECT t.round_number, t.sentence, t.submitted_at, p.nickname
    FROM turns t
    JOIN players p ON p.id = t.player_id
    WHERE t.game_id = ${id}
    ORDER BY t.round_number
  `

  return NextResponse.json({ game, players, turns })
}
