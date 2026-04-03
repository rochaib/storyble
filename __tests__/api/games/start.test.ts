// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { POST } from '@/app/api/games/[id]/start/route'

describe('POST /api/games/[id]/start', () => {
  beforeEach(() => {
    mockSql = createMockSql()
  })

  it('starts game when creator has >= 2 players', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1', player_count: 2,
    }])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p1' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('rejects non-creator', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1', player_count: 2,
    }])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p2' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(403)
  })

  it('rejects with < 2 players', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1', player_count: 1,
    }])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p1' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(400)
  })

  it('rejects already started game', async () => {
    mockSql.whenQuery(/FROM games g/).returns([{
      id: 'game-1', status: 'active', creator_id: 'p1', player_count: 2,
    }])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p1' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(409)
  })
})
