// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/push', () => ({
  sendTurnNotification: vi.fn().mockResolvedValue(undefined),
  sendGameClosedNotification: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/timeout/route'

describe('GET /api/cron/timeout', () => {
  beforeEach(() => {
    mockSql = createMockSql()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejects without valid auth', async () => {
    const req = mockRequest.get('/api/cron/timeout', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('processes timed-out games', async () => {
    // One timed-out game with 2 active players
    mockSql.whenQuery(/FROM games g/).returns([
      { id: 'game-1', current_round: 1, total_rounds: 3 },
    ])
    // Active players for game-1: round 1, index = 1 % 2 = 1 → p2 timed out
    mockSql.whenQuery(/FROM players WHERE/).returns([
      { id: 'p1' },
      { id: 'p2' },
    ])
    mockSql.whenQuery(/UPDATE players/).returns([{ id: 'p2' }])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.get('/api/cron/timeout', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.processed).toBe(1)
  })

  it('expires game when no players remain', async () => {
    mockSql.whenQuery(/FROM games g/).returns([
      { id: 'game-1', current_round: 1, total_rounds: 3 },
    ])
    // No active players
    mockSql.whenQuery(/FROM players WHERE/).returns([])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.get('/api/cron/timeout', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.processed).toBe(1)
  })
})
