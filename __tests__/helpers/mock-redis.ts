import { vi } from 'vitest'

export function createMockRateLimiter(shouldPass = true) {
  return {
    limit: vi.fn().mockResolvedValue({ success: shouldPass }),
  }
}

export function createMockRateLimits(shouldPass = true) {
  return {
    createGame: createMockRateLimiter(shouldPass),
    joinGame: createMockRateLimiter(shouldPass),
    submitTurn: createMockRateLimiter(shouldPass),
    pollGame: createMockRateLimiter(shouldPass),
    closeGame: createMockRateLimiter(shouldPass),
  }
}
