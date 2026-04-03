// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../../helpers/mock-db'
import { createMockRateLimits } from '../../helpers/mock-redis'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql
let mockRateLimits: ReturnType<typeof createMockRateLimits>

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/ratelimit', () => ({
  get rateLimits() { return mockRateLimits },
}))

import { GET } from '@/app/api/games/[id]/route'

describe('GET /api/games/[id]', () => {
  beforeEach(() => {
    mockSql = createMockSql()
    mockRateLimits = createMockRateLimits()
  })

  it('returns game state and players', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'active', opening_line: 'Once upon a time',
      total_rounds: 3, current_round: 1, created_at: new Date().toISOString(),
      timeout_minutes: null, player_count: 2,
    }])
    mockSql.whenQuery(/FROM players WHERE/).returns([
      { id: 'p1', nickname: 'Alice', join_order: 1, is_active: true },
      { id: 'p2', nickname: 'Bob', join_order: 2, is_active: true },
    ])

    const req = mockRequest.get('/api/games/game-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.game.id).toBe('game-1')
    expect(data.players).toHaveLength(2)
    // round 1, 2 active players: index = 1 % 2 = 1 → p2
    expect(data.current_player_id).toBe('p2')
  })

  it('returns 404 for missing game', async () => {
    mockSql.whenQuery(/FROM games g/).returns([])

    const req = mockRequest.get('/api/games/nope')
    const res = await GET(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimits.pollGame.limit.mockResolvedValue({ success: false })

    const req = mockRequest.get('/api/games/game-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(429)
  })
})
