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

import { POST } from '@/app/api/games/[id]/close/route'

describe('POST /api/games/[id]/close', () => {
  beforeEach(() => {
    mockSql = createMockSql()
    mockRateLimits = createMockRateLimits()
  })

  it('deletes lobby game when creator closes', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1',
    }])
    mockSql.whenQuery(/DELETE FROM games/).returns([])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p1' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('sets active game to closed status', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'active', creator_id: 'p1',
    }])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p1' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('rejects non-creator', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'active', creator_id: 'p1',
    }])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p2' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(403)
  })

  it('rejects closing completed game', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'complete', creator_id: 'p1',
    }])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p1' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(409)
  })
})
