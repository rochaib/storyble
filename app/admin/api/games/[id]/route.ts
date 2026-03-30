import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Action = 'lock' | 'unlock' | 'end' | 'discard' | 'archive' | 'delete'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action } = body as Record<string, unknown>
  const validActions: Action[] = ['lock', 'unlock', 'end', 'discard', 'archive', 'delete']
  if (typeof action !== 'string' || !validActions.includes(action as Action)) {
    return NextResponse.json(
      { error: `action must be one of: ${validActions.join(', ')}` },
      { status: 400 }
    )
  }

  const [game] = await sql`SELECT id, status FROM games WHERE id = ${id}`
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const status = game.status as string

  switch (action as Action) {
    case 'lock': {
      if (status !== 'active') {
        return NextResponse.json({ error: 'Can only lock active games' }, { status: 409 })
      }
      await sql`UPDATE games SET status = 'locked' WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }

    case 'unlock': {
      if (status !== 'locked') {
        return NextResponse.json({ error: 'Can only unlock locked games' }, { status: 409 })
      }
      await sql`UPDATE games SET status = 'active' WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }

    case 'end': {
      if (status !== 'active' && status !== 'locked') {
        return NextResponse.json({ error: 'Can only end active or locked games' }, { status: 409 })
      }
      await sql`UPDATE games SET status = 'complete' WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }

    case 'discard': {
      if (status !== 'lobby') {
        return NextResponse.json({ error: 'Can only discard lobby games' }, { status: 409 })
      }
      await sql`DELETE FROM games WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }

    case 'archive': {
      if (status !== 'complete') {
        return NextResponse.json({ error: 'Can only archive complete games' }, { status: 409 })
      }
      await sql`UPDATE games SET status = 'archived' WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }

    case 'delete': {
      if (status !== 'complete' && status !== 'archived') {
        return NextResponse.json({ error: 'Can only delete complete or archived games' }, { status: 409 })
      }
      await sql`DELETE FROM games WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }
  }
}
