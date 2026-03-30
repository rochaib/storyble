import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const [activeGames] = await sql`
    SELECT COUNT(*)::int AS count
    FROM games WHERE status IN ('lobby', 'active')
  `

  const [dailyPlayers] = await sql`
    SELECT COUNT(*)::int AS count
    FROM players p
    JOIN games g ON g.id = p.game_id
    WHERE g.created_at >= now() - interval '24 hours'
  `

  const [weeklyPlayers] = await sql`
    SELECT COUNT(*)::int AS count
    FROM players p
    JOIN games g ON g.id = p.game_id
    WHERE g.created_at >= now() - interval '7 days'
  `

  const npsRows = await sql`
    SELECT score FROM nps_responses
  `

  let npsScore: number | null = null
  const npsTotal = npsRows.length
  if (npsTotal > 0) {
    const promoters = npsRows.filter((r: Record<string, unknown>) => (r.score as number) >= 9).length
    const detractors = npsRows.filter((r: Record<string, unknown>) => (r.score as number) <= 6).length
    npsScore = Math.round(((promoters - detractors) / npsTotal) * 100)
  }

  return NextResponse.json({
    active_games: activeGames.count,
    daily_players: dailyPlayers.count,
    weekly_players: weeklyPlayers.count,
    nps_score: npsScore,
    nps_total: npsTotal,
  })
}
