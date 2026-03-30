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

  const [npsData] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN score >= 9 THEN 1 END)::int AS promoters,
      COUNT(CASE WHEN score <= 6 THEN 1 END)::int AS detractors
    FROM nps_responses
  `

  const npsTotal = npsData.total as number
  let npsScore: number | null = null
  if (npsTotal > 0) {
    const promoters = npsData.promoters as number
    const detractors = npsData.detractors as number
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
