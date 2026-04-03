// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../helpers/mock-db'
import { mockRequest } from '../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { POST } from '@/app/api/nps/route'

describe('POST /api/nps', () => {
  beforeEach(() => {
    mockSql = createMockSql()
  })

  it('accepts valid score', async () => {
    mockSql.whenQuery(/INSERT INTO nps_responses/).returns([])

    const req = mockRequest.post('/api/nps', { body: { score: 8 } })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('rejects score above 10', async () => {
    const req = mockRequest.post('/api/nps', { body: { score: 11 } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects non-integer', async () => {
    const req = mockRequest.post('/api/nps', { body: { score: 7.5 } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing score', async () => {
    const req = mockRequest.post('/api/nps', { body: {} })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
