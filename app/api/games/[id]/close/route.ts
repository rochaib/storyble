import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { rateLimits } from '@/lib/ratelimit'
import { sendGameClosedNotification } from '@/lib/push'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimits.closeGame.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { player_id } = await request.json()
  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

  const [game] = await sql`
    SELECT g.id, g.status,
           (SELECT id FROM players WHERE game_id = g.id ORDER BY join_order LIMIT 1) AS creator_id
    FROM games g
    WHERE g.id = ${id}
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.creator_id !== player_id) {
    return NextResponse.json({ error: 'Only the creator can close the game' }, { status: 403 })
  }
  if (!['lobby', 'active'].includes(game.status)) {
    return NextResponse.json({ error: 'Game cannot be closed in its current state' }, { status: 409 })
  }

  if (game.status === 'lobby') {
    await sql`DELETE FROM games WHERE id = ${id}`
  } else {
    await sql`UPDATE games SET status = 'closed' WHERE id = ${id}`
    sendGameClosedNotification(id, player_id).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
