import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [game] = await sql`
    SELECT id, status, opening_line FROM games WHERE id = ${id}
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'complete' && game.status !== 'archived') {
    return NextResponse.json({ error: 'Story not yet complete' }, { status: 403 })
  }

  const turns = await sql`
    SELECT t.sentence, t.round_number, p.nickname
    FROM turns t
    JOIN players p ON p.id = t.player_id
    WHERE t.game_id = ${id}
    ORDER BY t.round_number
  `

  return NextResponse.json({
    opening_line: game.opening_line,
    turns,
  })
}
