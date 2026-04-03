// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { verifyAdminPassword, createSessionToken, verifySessionToken } from '@/lib/auth'

beforeEach(() => {
  process.env.ADMIN_JWT_SECRET = 'test-jwt-secret-at-least-32-characters!!'
})

describe('verifyAdminPassword', () => {
  it('returns true for correct password', async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('correct-password', 10)
    expect(await verifyAdminPassword('correct-password')).toBe(true)
  })
  it('returns false for wrong password', async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('correct-password', 10)
    expect(await verifyAdminPassword('wrong-password')).toBe(false)
  })
  it('returns false if ADMIN_PASSWORD_HASH not set', async () => {
    delete process.env.ADMIN_PASSWORD_HASH
    expect(await verifyAdminPassword('any')).toBe(false)
  })
})

describe('createSessionToken + verifySessionToken', () => {
  it('creates a token that passes verification', async () => {
    const token = await createSessionToken()
    expect(await verifySessionToken(token)).toBe(true)
  })
  it('rejects a tampered token', async () => {
    expect(await verifySessionToken('not.a.jwt')).toBe(false)
  })
  it('rejects an empty string', async () => {
    expect(await verifySessionToken('')).toBe(false)
  })
})
