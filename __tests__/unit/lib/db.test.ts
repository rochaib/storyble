// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('lib/db', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when neither DATABASE_URL nor storage_DATABASE_URL is set', async () => {
    delete process.env.DATABASE_URL
    delete process.env.storage_DATABASE_URL

    await expect(() => import('@/lib/db')).rejects.toThrow(
      'DATABASE_URL or storage_DATABASE_URL environment variable is required'
    )
  })

  it('uses DATABASE_URL when set', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost/test'
    delete process.env.storage_DATABASE_URL
    const { sql } = await import('@/lib/db')
    expect(sql).toBeDefined()
  })

  it('falls back to storage_DATABASE_URL', async () => {
    delete process.env.DATABASE_URL
    process.env.storage_DATABASE_URL = 'postgres://test:test@localhost/test'
    const { sql } = await import('@/lib/db')
    expect(sql).toBeDefined()
  })
})
