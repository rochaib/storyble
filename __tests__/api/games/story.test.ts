// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { GET } from '@/app/api/games/[id]/story/route'

describe('GET /api/games/[id]/story', () => {
  beforeEach(() => {
    mockSql = createMockSql()
  })

  it('returns story for complete game', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'complete', opening_line: 'Once upon a time',
    }])
    mockSql.whenQuery(/FROM turns t/).returns([
      { sentence: 'The cat meowed.', round_number: 1, nickname: 'Alice' },
      { sentence: 'The dog barked.', round_number: 2, nickname: 'Bob' },
    ])

    const req = mockRequest.get('/api/games/game-1/story')
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.opening_line).toBe('Once upon a time')
    expect(data.turns).toHaveLength(2)
  })

  it('returns 403 for active game', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([{
      id: 'game-1', status: 'active', opening_line: 'Once upon a time',
    }])

    const req = mockRequest.get('/api/games/game-1/story')
    const res = await GET(req, { params: Promise.resolve({ id: 'game-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 for missing game', async () => {
    mockSql.whenQuery(/FROM games WHERE/).returns([])

    const req = mockRequest.get('/api/games/nope/story')
    const res = await GET(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
