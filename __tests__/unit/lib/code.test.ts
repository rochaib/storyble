import { describe, it, expect } from 'vitest'
import { generateCode, hashCode, verifyCode } from '@/lib/code'

describe('generateCode', () => {
  it('returns a 6-character string', () => {
    expect(generateCode()).toHaveLength(6)
  })
  it('only uses unambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/)
    }
  })
  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateCode))
    expect(codes.size).toBeGreaterThan(95)
  })
})

describe('hashCode', () => {
  it('returns a 64-character hex string', () => {
    expect(hashCode('ABC123', 'some-salt')).toHaveLength(64)
  })
  it('produces different hashes for different salts', () => {
    expect(hashCode('ABC123', 'salt-a')).not.toBe(hashCode('ABC123', 'salt-b'))
  })
  it('is deterministic', () => {
    expect(hashCode('ABC123', 'salt')).toBe(hashCode('ABC123', 'salt'))
  })
})

describe('verifyCode', () => {
  it('returns true for correct code + salt', () => {
    const salt = 'test-salt-uuid'
    const hash = hashCode('ABC123', salt)
    expect(verifyCode('ABC123', salt, hash)).toBe(true)
  })
  it('returns false for wrong code', () => {
    const salt = 'test-salt-uuid'
    const hash = hashCode('ABC123', salt)
    expect(verifyCode('WRONG1', salt, hash)).toBe(false)
  })
  it('is case-insensitive on input', () => {
    const salt = 'test-salt-uuid'
    const hash = hashCode('ABC123', salt)
    expect(verifyCode('abc123', salt, hash)).toBe(true)
  })
})
