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
vi.mock('@/lib/code', () => ({
  generateCode: () => 'ABC123',
  hashCode: (code: string, salt: string) => `hash-${code}-${salt}`,
  verifyCode: (input: string, salt: string, storedHash: string) =>
    storedHash === `hash-${input.toUpperCase()}-${salt}`,
}))

import { POST } from '@/app/api/games/join/route'

describe('POST /api/games/join', () => {
  beforeEach(() => {
    mockSql = createMockSql()
    mockRateLimits = createMockRateLimits()
  })

  it('joins game with valid code and nickname', async () => {
    mockSql.whenQuery(/FROM games g/).returns([
      { id: 'game-1', code_hash: 'hash-ABC123-salt-1', code_salt: 'salt-1', created_at: new Date().toISOString(), player_count: 1 },
    ])
    mockSql.whenQuery(/MAX\(join_order\)/).returns([{ max_order: 1 }])
    mockSql.whenQuery(/INSERT INTO players/).returns([{ id: 'player-2', game_id: 'game-1', nickname: 'Alice', join_order: 2 }])

    const req = mockRequest.post('/api/games/join', {
      body: { code: 'ABC123', nickname: 'Alice' },
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.player_id).toBe('player-2')
    expect(data.game_id).toBe('game-1')
  })

  it('returns 400 for missing code/nickname', async () => {
    const req = mockRequest.post('/api/games/join', {
      body: { code: 'ABC123' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 for invalid code', async () => {
    mockSql.whenQuery(/FROM games g/).returns([
      { id: 'game-1', code_hash: 'hash-WRONG-salt-1', code_salt: 'salt-1', created_at: new Date().toISOString(), player_count: 1 },
    ])

    const req = mockRequest.post('/api/games/join', {
      body: { code: 'XXXXXX', nickname: 'Alice' },
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimits.joinGame.limit.mockResolvedValue({ success: false })

    const req = mockRequest.post('/api/games/join', {
      body: { code: 'ABC123', nickname: 'Alice' },
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })
})
