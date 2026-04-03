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
}))

import { POST } from '@/app/api/games/route'

describe('POST /api/games', () => {
  beforeEach(() => {
    mockSql = createMockSql()
    mockRateLimits = createMockRateLimits()
  })

  it('creates game with valid input', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 0 }])
    mockSql.whenQuery(/INSERT INTO games/).returns([{ id: 'game-1', status: 'lobby', created_at: new Date().toISOString() }])

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Once upon a time', total_rounds: 3 },
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.game_id).toBe('game-1')
    expect(data.code).toBe('ABC123')
  })

  it('returns 400 for missing opening_line', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 0 }])

    const req = mockRequest.post('/api/games', {
      body: { total_rounds: 3 },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid total_rounds', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 0 }])

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Hello', total_rounds: 0 },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimits.createGame.limit.mockResolvedValue({ success: false })

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Hello', total_rounds: 3 },
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 503 when active game count >= 500', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 500 }])

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Hello', total_rounds: 3 },
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })
})
