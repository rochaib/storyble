// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, MockSql } from '../../helpers/mock-db'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { GET } from '@/app/admin/api/dashboard/route'

describe('GET /admin/api/dashboard', () => {
  beforeEach(() => {
    mockSql = createMockSql()
  })

  it('returns dashboard stats', async () => {
    // Active games count
    mockSql.whenQuery(/FROM games WHERE status/).returns([{ count: 5 }])
    // Daily players
    mockSql.whenQuery(/24 hours/).returns([{ count: 20 }])
    // Weekly players
    mockSql.whenQuery(/7 days/).returns([{ count: 100 }])
    // NPS data: 7 promoters (>=9), 1 detractor (<=6), 2 passives = 10 total
    // NPS = ((7 - 1) / 10) * 100 = 60
    mockSql.whenQuery(/FROM nps_responses/).returns([{
      total: 10, promoters: 7, detractors: 1,
    }])

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.active_games).toBe(5)
    expect(data.daily_players).toBe(20)
    expect(data.weekly_players).toBe(100)
    expect(data.nps_score).toBe(60)
    expect(data.nps_total).toBe(10)
  })
})
