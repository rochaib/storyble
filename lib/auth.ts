import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

function getJwtSecret() {
  return Buffer.from(
    process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production-32ch'
  )
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret())
}

export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, getJwtSecret())
    return true
  } catch {
    return false
  }
}
