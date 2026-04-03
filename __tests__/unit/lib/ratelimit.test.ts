// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: class { constructor() {} },
}))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    prefix: string
    constructor(opts: { prefix: string }) { this.prefix = opts.prefix }
    static slidingWindow() { return 'sliding-window' }
  },
}))

describe('lib/ratelimit', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  })

  it('exports all rate limiter instances', async () => {
    const { rateLimits } = await import('@/lib/ratelimit')
    expect(rateLimits.createGame).toBeDefined()
    expect(rateLimits.joinGame).toBeDefined()
    expect(rateLimits.submitTurn).toBeDefined()
    expect(rateLimits.pollGame).toBeDefined()
    expect(rateLimits.closeGame).toBeDefined()
  })
})
