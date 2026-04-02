import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { generateCode, hashCode } from '@/lib/code'
import { rateLimits } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimits.createGame.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM games WHERE status IN ('lobby', 'active')
  `
  if (count >= 500) {
    return NextResponse.json(
      { error: 'Too many active games right now, try again later' },
      { status: 503 }
    )
  }

  const body = await request.json()
  const { opening_line, total_rounds, timeout_minutes } = body

  if (!opening_line?.trim()) {
    return NextResponse.json({ error: 'opening_line is required' }, { status: 400 })
  }
  if (!Number.isInteger(total_rounds) || total_rounds < 1 || total_rounds > 1000) {
    return NextResponse.json(
      { error: 'total_rounds must be an integer between 1 and 1000' },
      { status: 400 }
    )
  }

  const code = generateCode()
  const codeSalt = crypto.randomUUID()
  const codeHash = hashCode(code, codeSalt)

  const [game] = await sql`
    INSERT INTO games (code_hash, code_salt, opening_line, total_rounds, timeout_minutes)
    VALUES (
      ${codeHash},
      ${codeSalt}::uuid,
      ${opening_line.trim()},
      ${total_rounds},
      ${timeout_minutes ?? null}
    )
    RETURNING id, status, created_at
  `

  return NextResponse.json({ game_id: game.id, code }, { status: 201 })
}
