// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { GET } from '@/app/api/games/[id]/turn/route'

describe('GET /api/games/[id]/turn', () => {
  beforeEach(() => {
    mockSql = createMockSql()
  })

  it('returns opening_line for round 1', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3, opening_line: 'Once upon a time',
    }])
    // 2 players, round 1: index = 1 % 2 = 1 → p2
    mockSql.whenQuery(/FROM players/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])

    const req = mockRequest.get('/api/games/game-1/turn', { searchParams: { player_id: 'p2' } })
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.previous_sentence).toBe('Once upon a time')
    expect(data.round).toBe(1)
  })

  it('returns previous turn sentence for round > 1', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', current_round: 2, total_rounds: 3, opening_line: 'Once upon a time',
    }])
    // 2 players, round 2: index = 2 % 2 = 0 → p1
    mockSql.whenQuery(/FROM players/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])
    mockSql.whenQuery(/FROM turns/).returns([{ sentence: 'The cat sat on the mat.' }])

    const req = mockRequest.get('/api/games/game-1/turn', { searchParams: { player_id: 'p1' } })
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.previous_sentence).toBe('The cat sat on the mat.')
    expect(data.round).toBe(2)
  })

  it('rejects wrong player', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3, opening_line: 'Once upon a time',
    }])
    mockSql.whenQuery(/FROM players/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])

    // p1 is not the current player for round 1 (index 1%2=1 → p2)
    const req = mockRequest.get('/api/games/game-1/turn', { searchParams: { player_id: 'p1' } })
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 400 without player_id', async () => {
    const req = mockRequest.get('/api/games/game-1/turn')
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(400)
  })
})
