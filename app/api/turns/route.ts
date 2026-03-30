import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { rateLimits } from '@/lib/ratelimit'
import { sendTurnNotification } from '@/lib/push'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimits.submitTurn.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { game_id, player_id, sentence } = await request.json()
  if (!game_id || !player_id || !sentence?.trim()) {
    return NextResponse.json({ error: 'game_id, player_id, and sentence are required' }, { status: 400 })
  }

  const [game] = await sql`
    SELECT id, status, current_round, total_rounds
    FROM games WHERE id = ${game_id}
  `
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status === 'locked') return NextResponse.json({ error: 'Game is locked' }, { status: 403 })
  if (game.status !== 'active') return NextResponse.json({ error: 'Game is not active' }, { status: 409 })

  const activePlayers = await sql`
    SELECT id FROM players
    WHERE game_id = ${game_id} AND is_active = true
    ORDER BY join_order
  `
  const currentIndex = (game.current_round - 1) % activePlayers.length
  if (activePlayers[currentIndex]?.id !== player_id) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  }

  await sql`
    INSERT INTO turns (game_id, player_id, round_number, sentence)
    VALUES (${game_id}, ${player_id}, ${game.current_round}, ${sentence.trim()})
  `

  const isLastRound = game.current_round === game.total_rounds

  if (isLastRound) {
    await sql`UPDATE games SET status = 'complete' WHERE id = ${game_id}`
  } else {
    await sql`UPDATE games SET current_round = current_round + 1 WHERE id = ${game_id}`
    const nextIndex = game.current_round % activePlayers.length
    const nextPlayerId = activePlayers[nextIndex]?.id
    if (nextPlayerId) await sendTurnNotification(nextPlayerId).catch(() => {})
  }

  return NextResponse.json({ ok: true, game_complete: isLastRound })
}
