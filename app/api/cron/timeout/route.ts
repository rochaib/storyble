import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendTurnNotification } from '@/lib/push'

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timedOutGames = await sql`
    SELECT g.id, g.current_round, g.total_rounds
    FROM games g
    WHERE g.status = 'active' AND g.timeout_hours IS NOT NULL
      AND EXTRACT(EPOCH FROM (
        now() - COALESCE(
          (SELECT submitted_at FROM turns WHERE game_id = g.id ORDER BY round_number DESC LIMIT 1),
          g.created_at
        )
      )) / 3600 > g.timeout_hours
  `

  let processed = 0
  for (const game of timedOutGames) {
    const activePlayers = await sql`
      SELECT id FROM players WHERE game_id = ${game.id} AND is_active = true ORDER BY join_order
    `

    if (activePlayers.length === 0) {
      await sql`UPDATE games SET status = 'expired' WHERE id = ${game.id}`
      processed++
      continue
    }

    const currentIndex = (game.current_round - 1) % activePlayers.length
    const timedOutPlayer = activePlayers[currentIndex]

    if (timedOutPlayer) {
      const updated = await sql`
        UPDATE players SET is_active = false
        WHERE id = ${timedOutPlayer.id} AND is_active = true
        RETURNING id
      `
      if (updated.length === 0) continue // already processed, skip
    }

    const remaining = activePlayers.filter((p: Record<string, unknown>) => p['id'] !== timedOutPlayer?.id)

    if (remaining.length < 1) {
      await sql`UPDATE games SET status = 'expired' WHERE id = ${game.id}`
    } else if (game.current_round === game.total_rounds) {
      await sql`UPDATE games SET status = 'complete' WHERE id = ${game.id}`
    } else {
      await sql`UPDATE games SET current_round = current_round + 1 WHERE id = ${game.id}`
      const nextIndex = game.current_round % remaining.length
      const nextId = remaining[nextIndex]?.id
      if (nextId) await sendTurnNotification(nextId).catch((err) => {
        console.error(`[cron/timeout] push notification failed for player ${nextId}:`, err)
      })
    }
    processed++
  }

  return NextResponse.json({ processed })
}
