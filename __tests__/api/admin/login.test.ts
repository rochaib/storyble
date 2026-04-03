// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest } from '../../helpers/mock-request'

// We mock @/lib/auth instead of setting bcrypt hashes
let mockVerifyPassword: (pw: string) => Promise<boolean>
let mockCreateToken: () => Promise<string>

vi.mock('@/lib/auth', () => ({
  get verifyAdminPassword() { return mockVerifyPassword },
  get createSessionToken() { return mockCreateToken },
}))

import { POST } from '@/app/admin/api/login/route'

describe('POST /admin/api/login', () => {
  beforeEach(() => {
    mockVerifyPassword = async (pw: string) => pw === 'correct-password'
    mockCreateToken = async () => 'mock-jwt-token'
  })

  it('returns 200 and sets httpOnly cookie for valid password', async () => {
    const req = mockRequest.post('/admin/api/login', {
      body: { password: 'correct-password' },
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('admin_session=mock-jwt-token')
    expect(setCookie).toContain('HttpOnly')
  })

  it('returns 401 for wrong password', async () => {
    const req = mockRequest.post('/admin/api/login', {
      body: { password: 'wrong-password' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing password', async () => {
    const req = mockRequest.post('/admin/api/login', {
      body: {},
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
