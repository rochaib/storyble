import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const { score } = await request.json()
  if (typeof score !== 'number' || score < 0 || score > 10 || !Number.isInteger(score)) {
    return NextResponse.json({ error: 'score must be an integer 0–10' }, { status: 400 })
  }
  await sql`INSERT INTO nps_responses (score) VALUES (${score})`
  return NextResponse.json({ ok: true })
}
