import { createHash } from 'crypto'

// Omit ambiguous characters: 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

export function hashCode(code: string, salt: string): string {
  return createHash('sha256')
    .update(code.toUpperCase() + salt)
    .digest('hex')
}

export function verifyCode(
  input: string,
  salt: string,
  storedHash: string
): boolean {
  return hashCode(input, salt) === storedHash
}
