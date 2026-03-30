import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { creator_player_id } = await request.json()

  const [game] = await sql`
    SELECT g.id, g.status,
           (SELECT id FROM players WHERE game_id = g.id ORDER BY join_order LIMIT 1) AS creator_id,
           COUNT(p.id)::int AS player_count
    FROM games g
    LEFT JOIN players p ON p.game_id = g.id
    WHERE g.id = ${id}
    GROUP BY g.id
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 409 })
  if (game.creator_id !== creator_player_id) return NextResponse.json({ error: 'Only the creator can start' }, { status: 403 })
  if (game.player_count < 2) return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })

  await sql`UPDATE games SET status = 'active' WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
