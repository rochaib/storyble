import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const { player_id, subscription } = await request.json()
  if (!player_id || !subscription?.endpoint) {
    return NextResponse.json({ error: 'player_id and subscription required' }, { status: 400 })
  }
  await sql`
    INSERT INTO push_subscriptions (player_id, endpoint, p256dh, auth)
    VALUES (${player_id}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    ON CONFLICT (endpoint) DO NOTHING
  `
  return NextResponse.json({ ok: true })
}
