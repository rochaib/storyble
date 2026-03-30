import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [game] = await sql`
    SELECT id, status, opening_line, total_rounds, created_at
    FROM games WHERE id = ${id}
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  // Admin can view story for complete or archived games
  if (game.status !== 'complete' && game.status !== 'archived') {
    return NextResponse.json(
      { error: 'Story only available for complete or archived games' },
      { status: 409 }
    )
  }

  const turns = await sql`
    SELECT t.sentence, t.round_number, t.submitted_at, p.nickname
    FROM turns t
    JOIN players p ON p.id = t.player_id
    WHERE t.game_id = ${id}
    ORDER BY t.round_number
  `

  return NextResponse.json({
    game: {
      id: game.id,
      status: game.status,
      opening_line: game.opening_line,
      total_rounds: game.total_rounds,
      created_at: game.created_at,
    },
    turns,
  })
}
