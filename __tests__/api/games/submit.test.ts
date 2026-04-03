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
vi.mock('@/lib/push', () => ({
  sendTurnNotification: vi.fn().mockResolvedValue(undefined),
  sendGameClosedNotification: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/turns/route'

describe('POST /api/turns', () => {
  beforeEach(() => {
    mockSql = createMockSql()
    mockRateLimits = createMockRateLimits()
  })

  it('submits sentence and advances round', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3,
    }])
    // 2 players, round 1: index = 1 % 2 = 1 → p2
    mockSql.whenQuery(/FROM players/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])
    mockSql.whenQuery(/INSERT INTO turns/).returns([])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1', player_id: 'p2', sentence: 'The dog barked.' },
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.game_complete).toBe(false)
  })

  it('completes game on final round', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', current_round: 3, total_rounds: 3,
    }])
    // 2 players, round 3: index = 3 % 2 = 1 → p2
    mockSql.whenQuery(/FROM players/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])
    mockSql.whenQuery(/INSERT INTO turns/).returns([])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1', player_id: 'p2', sentence: 'The end.' },
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.game_complete).toBe(true)
  })

  it('returns 400 for missing fields', async () => {
    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 for wrong player', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3,
    }])
    // round 1 with 2 players → index 1 → p2 is current
    mockSql.whenQuery(/FROM players/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])

    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1', player_id: 'p1', sentence: 'Wrong turn.' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
