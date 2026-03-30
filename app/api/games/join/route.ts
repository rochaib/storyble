import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyCode } from '@/lib/code'
import { rateLimits } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimits.joinGame.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { code, nickname } = await request.json()
  if (!code || !nickname?.trim()) {
    return NextResponse.json({ error: 'code and nickname are required' }, { status: 400 })
  }

  // Fetch all lobby games to find the matching code
  const lobbyGames = await sql`
    SELECT g.id, g.code_hash, g.code_salt, g.created_at,
           COUNT(p.id)::int AS player_count
    FROM games g
    LEFT JOIN players p ON p.game_id = g.id
    WHERE g.status = 'lobby'
    GROUP BY g.id
  `

  const game = lobbyGames.find(g =>
    verifyCode(code, g.code_salt, g.code_hash)
  )

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Lobby expiry: >5 min old with fewer than 2 players
  const ageMinutes = (Date.now() - new Date(game.created_at).getTime()) / 60000
  if (ageMinutes > 5 && game.player_count < 2) {
    await sql`DELETE FROM games WHERE id = ${game.id}`
    return NextResponse.json({ error: 'Game expired' }, { status: 404 })
  }

  const [{ max_order }] = await sql`
    SELECT COALESCE(MAX(join_order), 0)::int AS max_order
    FROM players WHERE game_id = ${game.id}
  `
  const [player] = await sql`
    INSERT INTO players (game_id, nickname, join_order)
    VALUES (${game.id}, ${nickname.trim()}, ${max_order + 1})
    RETURNING id, game_id, nickname, join_order
  `

  return NextResponse.json(
    { player_id: player.id, game_id: player.game_id },
    { status: 201 }
  )
}
