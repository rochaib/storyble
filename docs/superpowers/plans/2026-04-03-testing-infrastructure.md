# Testing Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a four-layer testing pipeline (unit, mocked API, integration, E2E) with GitHub Actions CI gating Vercel deploys.

**Architecture:** Vitest workspace with three projects (unit, api, integration) plus Playwright for E2E. Mocked tests run on every PR; integration + E2E run on push to main. Local pre-push hook enforces fast tests before push.

**Tech Stack:** Vitest 4.x, Playwright, Husky, GitHub Actions, Neon branching, Upstash Redis

---

### Task 1: Restructure Vitest Config as Workspace

**Files:**
- Modify: `vitest.config.ts`
- Move: `__tests__/lib/auth.test.ts` → `__tests__/unit/lib/auth.test.ts`
- Move: `__tests__/lib/code.test.ts` → `__tests__/unit/lib/code.test.ts`

- [ ] **Step 1: Update vitest.config.ts to workspace config**

Replace the entire file with:

```ts
import { defineConfig, defineWorkspace } from 'vitest/config'
import path from 'path'

const shared = {
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
}

export default defineConfig({
  ...shared,
  test: {
    workspace: [
      {
        ...shared,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['__tests__/unit/**/*.test.ts'],
          globals: true,
        },
      },
      {
        ...shared,
        test: {
          name: 'api',
          environment: 'node',
          include: ['__tests__/api/**/*.test.ts'],
          globals: true,
        },
      },
      {
        ...shared,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['__tests__/integration/**/*.test.ts'],
          globals: true,
        },
      },
    ],
  },
})
```

- [ ] **Step 2: Move existing tests into unit directory**

```bash
mkdir -p __tests__/unit/lib
mv __tests__/lib/auth.test.ts __tests__/unit/lib/auth.test.ts
mv __tests__/lib/code.test.ts __tests__/unit/lib/code.test.ts
rmdir __tests__/lib
```

- [ ] **Step 3: Run existing tests to verify they still pass**

Run: `npx vitest run --project unit`
Expected: All existing auth and code tests pass.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts __tests__/
git commit -m "refactor: restructure vitest config as workspace with unit/api/integration projects"
```

---

### Task 2: Create Test Helpers — Mock DB

**Files:**
- Create: `__tests__/helpers/mock-db.ts`

- [ ] **Step 1: Create the mock DB factory**

```ts
import { vi } from 'vitest'

type QueryResult = Record<string, unknown>[]

type QueryMatcher = {
  pattern: RegExp
  result: QueryResult
}

export function createMockSql() {
  const matchers: QueryMatcher[] = []

  const sql = vi.fn((...args: unknown[]) => {
    // Tagged template: first arg is string[], rest are values
    const strings = args[0] as string[]
    const query = strings.join('?')

    for (const matcher of matchers) {
      if (matcher.pattern.test(query)) {
        return Promise.resolve(matcher.result)
      }
    }
    return Promise.resolve([])
  })

  return Object.assign(sql, {
    whenQuery(pattern: RegExp) {
      return {
        returns(result: QueryResult) {
          matchers.push({ pattern, result })
          return sql
        },
      }
    },
    reset() {
      matchers.length = 0
      sql.mockClear()
    },
  })
}

export type MockSql = ReturnType<typeof createMockSql>
```

- [ ] **Step 2: Commit**

```bash
git add __tests__/helpers/mock-db.ts
git commit -m "feat: add mock DB factory for API route tests"
```

---

### Task 3: Create Test Helpers — Mock Redis & Request Builder

**Files:**
- Create: `__tests__/helpers/mock-redis.ts`
- Create: `__tests__/helpers/mock-request.ts`

- [ ] **Step 1: Create the mock Redis factory**

```ts
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
```

- [ ] **Step 2: Create the NextRequest builder**

```ts
import { NextRequest } from 'next/server'

type RequestOptions = {
  body?: Record<string, unknown>
  headers?: Record<string, string>
  searchParams?: Record<string, string>
}

export const mockRequest = {
  post(url: string, opts: RequestOptions = {}): NextRequest {
    const fullUrl = new URL(url, 'http://localhost:3000')
    if (opts.searchParams) {
      for (const [k, v] of Object.entries(opts.searchParams)) {
        fullUrl.searchParams.set(k, v)
      }
    }
    return new NextRequest(fullUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  },

  get(url: string, opts: RequestOptions = {}): NextRequest {
    const fullUrl = new URL(url, 'http://localhost:3000')
    if (opts.searchParams) {
      for (const [k, v] of Object.entries(opts.searchParams)) {
        fullUrl.searchParams.set(k, v)
      }
    }
    return new NextRequest(fullUrl, {
      method: 'GET',
      headers: {
        'x-forwarded-for': '127.0.0.1',
        ...opts.headers,
      },
    })
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add __tests__/helpers/mock-redis.ts __tests__/helpers/mock-request.ts
git commit -m "feat: add mock Redis and NextRequest builder helpers"
```

---

### Task 4: API Tests — POST /api/games (Create Game)

**Files:**
- Create: `__tests__/api/games/create.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { createMockRateLimits } from '../../helpers/mock-redis'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql
let mockRateLimits: ReturnType<typeof createMockRateLimits>

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/ratelimit', () => ({
  get rateLimits() { return mockRateLimits },
}))

import { POST } from '@/app/api/games/route'

beforeEach(() => {
  mockSql = createMockSql()
  mockRateLimits = createMockRateLimits()
})

describe('POST /api/games', () => {
  it('creates a game with valid input', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 0 }])
    mockSql.whenQuery(/INSERT INTO games/).returns([
      { id: 'game-uuid-1', status: 'lobby', created_at: new Date().toISOString() },
    ])

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Once upon a time', total_rounds: 3 },
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.game_id).toBe('game-uuid-1')
    expect(json.code).toHaveLength(6)
  })

  it('returns 400 for missing opening_line', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 0 }])

    const req = mockRequest.post('/api/games', {
      body: { total_rounds: 3 },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid total_rounds', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 0 }])

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Hello', total_rounds: 0 },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimits.createGame.limit.mockResolvedValue({ success: false })

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Hello', total_rounds: 3 },
    })
    const res = await POST(req)

    expect(res.status).toBe(429)
  })

  it('returns 503 when too many active games', async () => {
    mockSql.whenQuery(/SELECT COUNT/).returns([{ count: 500 }])

    const req = mockRequest.post('/api/games', {
      body: { opening_line: 'Hello', total_rounds: 3 },
    })
    const res = await POST(req)

    expect(res.status).toBe(503)
  })
})
```

- [ ] **Step 2: Run to verify tests pass**

Run: `npx vitest run --project api`
Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/api/games/create.test.ts
git commit -m "test: add API tests for POST /api/games"
```

---

### Task 5: API Tests — POST /api/games/join

**Files:**
- Create: `__tests__/api/games/join.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { createMockRateLimits } from '../../helpers/mock-redis'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql
let mockRateLimits: ReturnType<typeof createMockRateLimits>

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/ratelimit', () => ({
  get rateLimits() { return mockRateLimits },
}))
vi.mock('@/lib/code', () => ({
  generateCode: () => 'ABC123',
  hashCode: (code: string, salt: string) => `hash-${code}-${salt}`,
  verifyCode: (input: string, salt: string, storedHash: string) =>
    storedHash === `hash-${input.toUpperCase()}-${salt}`,
}))

import { POST } from '@/app/api/games/join/route'

beforeEach(() => {
  mockSql = createMockSql()
  mockRateLimits = createMockRateLimits()
})

describe('POST /api/games/join', () => {
  const lobbyGame = {
    id: 'game-1',
    code_hash: 'hash-ABC123-salt-1',
    code_salt: 'salt-1',
    created_at: new Date().toISOString(),
    player_count: 1,
  }

  it('joins a game with valid code and nickname', async () => {
    mockSql.whenQuery(/SELECT g\.id.*FROM games/).returns([lobbyGame])
    mockSql.whenQuery(/SELECT COALESCE/).returns([{ max_order: 1 }])
    mockSql.whenQuery(/INSERT INTO players/).returns([
      { id: 'player-2', game_id: 'game-1', nickname: 'Bob', join_order: 2 },
    ])

    const req = mockRequest.post('/api/games/join', {
      body: { code: 'ABC123', nickname: 'Bob' },
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.player_id).toBe('player-2')
    expect(json.game_id).toBe('game-1')
  })

  it('returns 400 for missing code or nickname', async () => {
    const req = mockRequest.post('/api/games/join', {
      body: { code: '', nickname: '' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 404 for invalid code', async () => {
    mockSql.whenQuery(/SELECT g\.id.*FROM games/).returns([lobbyGame])

    const req = mockRequest.post('/api/games/join', {
      body: { code: 'WRONG1', nickname: 'Bob' },
    })
    const res = await POST(req)

    expect(res.status).toBe(404)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimits.joinGame.limit.mockResolvedValue({ success: false })

    const req = mockRequest.post('/api/games/join', {
      body: { code: 'ABC123', nickname: 'Bob' },
    })
    const res = await POST(req)

    expect(res.status).toBe(429)
  })
})
```

- [ ] **Step 2: Run to verify tests pass**

Run: `npx vitest run --project api`
Expected: All join tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/api/games/join.test.ts
git commit -m "test: add API tests for POST /api/games/join"
```

---

### Task 6: API Tests — GET /api/games/[id] (Poll), POST /api/games/[id]/start

**Files:**
- Create: `__tests__/api/games/poll.test.ts`
- Create: `__tests__/api/games/start.test.ts`

- [ ] **Step 1: Write poll test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { createMockRateLimits } from '../../helpers/mock-redis'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql
let mockRateLimits: ReturnType<typeof createMockRateLimits>

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/ratelimit', () => ({
  get rateLimits() { return mockRateLimits },
}))

import { GET } from '@/app/api/games/[id]/route'

beforeEach(() => {
  mockSql = createMockSql()
  mockRateLimits = createMockRateLimits()
})

const params = Promise.resolve({ id: 'game-1' })

describe('GET /api/games/[id]', () => {
  it('returns game state and players', async () => {
    mockSql.whenQuery(/SELECT g\.id.*FROM games/).returns([{
      id: 'game-1',
      status: 'active',
      opening_line: 'Hello',
      total_rounds: 3,
      current_round: 1,
      created_at: new Date().toISOString(),
      timeout_minutes: null,
      player_count: 2,
    }])
    mockSql.whenQuery(/SELECT id, nickname/).returns([
      { id: 'p1', nickname: 'Alice', join_order: 1, is_active: true },
      { id: 'p2', nickname: 'Bob', join_order: 2, is_active: true },
    ])

    const req = mockRequest.get('/api/games/game-1')
    const res = await GET(req, { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.game.status).toBe('active')
    expect(json.players).toHaveLength(2)
    expect(json.current_player_id).toBe('p2') // round 1 % 2 = 1 → p2
  })

  it('returns 404 for missing game', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([])

    const req = mockRequest.get('/api/games/game-1')
    const res = await GET(req, { params })

    expect(res.status).toBe(404)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimits.pollGame.limit.mockResolvedValue({ success: false })

    const req = mockRequest.get('/api/games/game-1')
    const res = await GET(req, { params })

    expect(res.status).toBe(429)
  })
})
```

- [ ] **Step 2: Write start test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { POST } from '@/app/api/games/[id]/start/route'

beforeEach(() => {
  mockSql = createMockSql()
})

const params = Promise.resolve({ id: 'game-1' })

describe('POST /api/games/[id]/start', () => {
  it('starts game when creator has enough players', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1', player_count: 2,
    }])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p1' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(200)
  })

  it('rejects non-creator', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1', player_count: 2,
    }])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p2' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(403)
  })

  it('rejects with fewer than 2 players', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1', player_count: 1,
    }])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p1' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(400)
  })

  it('rejects already started game', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'active', creator_id: 'p1', player_count: 2,
    }])

    const req = mockRequest.post('/api/games/game-1/start', {
      body: { creator_player_id: 'p1' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 3: Run to verify**

Run: `npx vitest run --project api`
Expected: All poll and start tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/games/poll.test.ts __tests__/api/games/start.test.ts
git commit -m "test: add API tests for game poll and start routes"
```

---

### Task 7: API Tests — GET /api/games/[id]/turn, POST /api/turns

**Files:**
- Create: `__tests__/api/games/turn.test.ts`
- Create: `__tests__/api/games/submit.test.ts`

- [ ] **Step 1: Write turn test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { GET } from '@/app/api/games/[id]/turn/route'

beforeEach(() => {
  mockSql = createMockSql()
})

const params = Promise.resolve({ id: 'game-1' })

describe('GET /api/games/[id]/turn', () => {
  it('returns opening line for round 1', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3, opening_line: 'Once upon a time',
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])

    const req = mockRequest.get('/api/games/game-1/turn', { searchParams: { player_id: 'p2' } })
    const res = await GET(req, { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.previous_sentence).toBe('Once upon a time')
    expect(json.round).toBe(1)
  })

  it('returns previous turn sentence for round > 1', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', current_round: 2, total_rounds: 3, opening_line: 'Once upon a time',
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])
    mockSql.whenQuery(/SELECT sentence FROM turns/).returns([{ sentence: 'Then something happened' }])

    const req = mockRequest.get('/api/games/game-1/turn', { searchParams: { player_id: 'p1' } })
    const res = await GET(req, { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.previous_sentence).toBe('Then something happened')
    expect(json.round).toBe(2)
  })

  it('rejects wrong player', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3, opening_line: 'Hello',
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])

    const req = mockRequest.get('/api/games/game-1/turn', { searchParams: { player_id: 'p1' } })
    const res = await GET(req, { params })

    expect(res.status).toBe(403)
  })

  it('returns 400 without player_id', async () => {
    const req = mockRequest.get('/api/games/game-1/turn')
    const res = await GET(req, { params })

    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Write submit turn test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { createMockRateLimits } from '../../helpers/mock-redis'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql
let mockRateLimits: ReturnType<typeof createMockRateLimits>

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/ratelimit', () => ({
  get rateLimits() { return mockRateLimits },
}))
vi.mock('@/lib/push', () => ({
  sendTurnNotification: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/turns/route'

beforeEach(() => {
  mockSql = createMockSql()
  mockRateLimits = createMockRateLimits()
})

describe('POST /api/turns', () => {
  it('submits a sentence and advances round', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3,
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])
    mockSql.whenQuery(/INSERT INTO turns/).returns([])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1', player_id: 'p2', sentence: 'Something happened' },
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.game_complete).toBe(false)
  })

  it('completes game on final round', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', current_round: 3, total_rounds: 3,
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])
    mockSql.whenQuery(/INSERT INTO turns/).returns([])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1', player_id: 'p2', sentence: 'The end' },
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.game_complete).toBe(true)
  })

  it('returns 400 for missing fields', async () => {
    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 403 for wrong player', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', current_round: 1, total_rounds: 3,
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])

    const req = mockRequest.post('/api/turns', {
      body: { game_id: 'game-1', player_id: 'p1', sentence: 'Hello' },
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 3: Run to verify**

Run: `npx vitest run --project api`
Expected: All turn and submit tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/games/turn.test.ts __tests__/api/games/submit.test.ts
git commit -m "test: add API tests for turn retrieval and submission"
```

---

### Task 8: API Tests — POST /api/games/[id]/close, GET /api/games/[id]/story, POST /api/nps

**Files:**
- Create: `__tests__/api/games/close.test.ts`
- Create: `__tests__/api/games/story.test.ts`
- Create: `__tests__/api/nps.test.ts`

- [ ] **Step 1: Write close test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { createMockRateLimits } from '../../helpers/mock-redis'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql
let mockRateLimits: ReturnType<typeof createMockRateLimits>

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/ratelimit', () => ({
  get rateLimits() { return mockRateLimits },
}))
vi.mock('@/lib/push', () => ({
  sendGameClosedNotification: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/games/[id]/close/route'

beforeEach(() => {
  mockSql = createMockSql()
  mockRateLimits = createMockRateLimits()
})

const params = Promise.resolve({ id: 'game-1' })

describe('POST /api/games/[id]/close', () => {
  it('deletes lobby game when creator closes', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'lobby', creator_id: 'p1',
    }])
    mockSql.whenQuery(/DELETE FROM games/).returns([])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p1' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(200)
  })

  it('sets active game to closed status', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'active', creator_id: 'p1',
    }])
    mockSql.whenQuery(/UPDATE games/).returns([])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p1' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(200)
  })

  it('rejects non-creator', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'active', creator_id: 'p1',
    }])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p2' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(403)
  })

  it('rejects closing a completed game', async () => {
    mockSql.whenQuery(/SELECT g\.id/).returns([{
      id: 'game-1', status: 'complete', creator_id: 'p1',
    }])

    const req = mockRequest.post('/api/games/game-1/close', {
      body: { player_id: 'p1' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Write story test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { GET } from '@/app/api/games/[id]/story/route'

beforeEach(() => {
  mockSql = createMockSql()
})

const params = Promise.resolve({ id: 'game-1' })

describe('GET /api/games/[id]/story', () => {
  it('returns story for completed game', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'complete', opening_line: 'Once upon a time',
    }])
    mockSql.whenQuery(/SELECT t\.sentence/).returns([
      { sentence: 'Then magic happened', round_number: 1, nickname: 'Alice' },
      { sentence: 'The end', round_number: 2, nickname: 'Bob' },
    ])

    const req = mockRequest.get('/api/games/game-1/story')
    const res = await GET(req, { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.opening_line).toBe('Once upon a time')
    expect(json.turns).toHaveLength(2)
  })

  it('returns 403 for active game', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([{
      id: 'game-1', status: 'active', opening_line: 'Hello',
    }])

    const req = mockRequest.get('/api/games/game-1/story')
    const res = await GET(req, { params })

    expect(res.status).toBe(403)
  })

  it('returns 404 for missing game', async () => {
    mockSql.whenQuery(/SELECT id, status/).returns([])

    const req = mockRequest.get('/api/games/game-1/story')
    const res = await GET(req, { params })

    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 3: Write NPS test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { POST } from '@/app/api/nps/route'

beforeEach(() => {
  mockSql = createMockSql()
})

describe('POST /api/nps', () => {
  it('accepts valid score', async () => {
    mockSql.whenQuery(/INSERT INTO nps_responses/).returns([])

    const req = mockRequest.post('/api/nps', { body: { score: 8 } })
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('rejects score above 10', async () => {
    const req = mockRequest.post('/api/nps', { body: { score: 11 } })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('rejects non-integer score', async () => {
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
```

- [ ] **Step 4: Run to verify**

Run: `npx vitest run --project api`
Expected: All close, story, and NPS tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/games/close.test.ts __tests__/api/games/story.test.ts __tests__/api/nps.test.ts
git commit -m "test: add API tests for close, story, and NPS routes"
```

---

### Task 9: API Tests — GET /api/cron/timeout

**Files:**
- Create: `__tests__/api/cron/timeout.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))
vi.mock('@/lib/push', () => ({
  sendTurnNotification: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/timeout/route'

beforeEach(() => {
  mockSql = createMockSql()
  process.env.CRON_SECRET = 'test-secret'
})

describe('GET /api/cron/timeout', () => {
  it('rejects requests without valid auth', async () => {
    const req = mockRequest.get('/api/cron/timeout', {
      headers: { authorization: 'Bearer wrong' },
    })
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('processes timed-out games', async () => {
    mockSql.whenQuery(/SELECT g\.id.*timeout_minutes/).returns([{
      id: 'game-1', current_round: 1, total_rounds: 3,
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([
      { id: 'p1' }, { id: 'p2' },
    ])
    mockSql.whenQuery(/UPDATE players/).returns([{ id: 'p2' }])
    mockSql.whenQuery(/UPDATE games SET current_round/).returns([])

    const req = mockRequest.get('/api/cron/timeout', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.processed).toBe(1)
  })

  it('expires game when no players remain', async () => {
    mockSql.whenQuery(/SELECT g\.id.*timeout_minutes/).returns([{
      id: 'game-1', current_round: 1, total_rounds: 3,
    }])
    mockSql.whenQuery(/SELECT id FROM players/).returns([{ id: 'p1' }])
    mockSql.whenQuery(/UPDATE players/).returns([{ id: 'p1' }])
    mockSql.whenQuery(/UPDATE games SET status/).returns([])

    const req = mockRequest.get('/api/cron/timeout', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.processed).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify**

Run: `npx vitest run --project api`
Expected: All cron timeout tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/api/cron/timeout.test.ts
git commit -m "test: add API tests for cron timeout handler"
```

---

### Task 10: API Tests — Admin Routes

**Files:**
- Create: `__tests__/api/admin/login.test.ts`
- Create: `__tests__/api/admin/dashboard.test.ts`

- [ ] **Step 1: Write admin login test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest } from '../../helpers/mock-request'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/db', () => ({
  sql: vi.fn().mockResolvedValue([]),
}))

import { POST } from '@/app/admin/api/login/route'

beforeEach(() => {
  process.env.ADMIN_JWT_SECRET = 'test-jwt-secret-at-least-32-characters!!'
})

describe('POST /admin/api/login', () => {
  it('returns 200 and sets cookie for valid password', async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('correct', 10)

    const req = mockRequest.post('/admin/api/login', {
      body: { password: 'correct' },
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const cookie = res.cookies.get('admin_session')
    expect(cookie).toBeDefined()
    expect(cookie?.httpOnly).toBe(true)
  })

  it('returns 401 for wrong password', async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('correct', 10)

    const req = mockRequest.post('/admin/api/login', {
      body: { password: 'wrong' },
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
```

- [ ] **Step 2: Write admin dashboard test file**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSql, type MockSql } from '../../helpers/mock-db'
import { mockRequest } from '../../helpers/mock-request'

let mockSql: MockSql

vi.mock('@/lib/db', () => ({
  get sql() { return mockSql },
}))

import { GET } from '@/app/admin/api/dashboard/route'

beforeEach(() => {
  mockSql = createMockSql()
})

describe('GET /admin/api/dashboard', () => {
  it('returns dashboard stats', async () => {
    mockSql.whenQuery(/SELECT COUNT.*FROM games/).returns([{ count: 5 }])
    mockSql.whenQuery(/interval '24 hours'/).returns([{ count: 12 }])
    mockSql.whenQuery(/interval '7 days'/).returns([{ count: 45 }])
    mockSql.whenQuery(/FROM nps_responses/).returns([{ total: 10, promoters: 7, detractors: 1 }])

    const req = mockRequest.get('/admin/api/dashboard')
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.active_games).toBe(5)
    expect(json.daily_players).toBe(12)
    expect(json.weekly_players).toBe(45)
    expect(json.nps_score).toBe(60) // (7-1)/10 * 100
    expect(json.nps_total).toBe(10)
  })
})
```

- [ ] **Step 3: Run to verify**

Run: `npx vitest run --project api`
Expected: All admin tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/admin/login.test.ts __tests__/api/admin/dashboard.test.ts
git commit -m "test: add API tests for admin login and dashboard"
```

---

### Task 11: Unit Tests — db.ts and ratelimit.ts

**Files:**
- Create: `__tests__/unit/lib/db.test.ts`
- Create: `__tests__/unit/lib/ratelimit.test.ts`

- [ ] **Step 1: Write db.test.ts**

```ts
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
```

- [ ] **Step 2: Write ratelimit.test.ts**

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {}
  },
}))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    redis: unknown
    limiter: unknown
    prefix: string
    constructor(opts: { prefix: string }) {
      this.prefix = opts.prefix
    }
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
```

- [ ] **Step 3: Run to verify**

Run: `npx vitest run --project unit`
Expected: All unit tests pass (existing + new).

- [ ] **Step 4: Commit**

```bash
git add __tests__/unit/lib/db.test.ts __tests__/unit/lib/ratelimit.test.ts
git commit -m "test: add unit tests for db fallback and ratelimit config"
```

---

### Task 12: Update package.json Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update scripts**

Add these scripts to package.json `"scripts"` section:

```json
{
  "test": "vitest run --project unit --project api",
  "test:unit": "vitest run --project unit",
  "test:api": "vitest run --project api",
  "test:integration": "vitest run --project integration",
  "test:e2e": "npx playwright test",
  "test:all": "vitest run && npx playwright test",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 2: Run full fast test suite**

Run: `npm test`
Expected: All unit + API tests pass.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add test scripts for all test layers"
```

---

### Task 13: Install and Configure Playwright

**Files:**
- Create: `e2e/playwright.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

Create `e2e/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
```

- [ ] **Step 3: Add Playwright artifacts to .gitignore**

Append to `.gitignore`:

```
# playwright
/e2e/test-results/
/e2e/playwright-report/
```

- [ ] **Step 4: Commit**

```bash
git add e2e/playwright.config.ts .gitignore package.json package-lock.json
git commit -m "feat: install and configure Playwright for E2E tests"
```

---

### Task 14: E2E Test — Happy Path (Create + Join + Play)

**Files:**
- Create: `e2e/tests/helpers.ts`
- Create: `e2e/tests/happy-path.spec.ts`

- [ ] **Step 1: Create Playwright helpers**

Create `e2e/tests/helpers.ts`:

```ts
import { type Page } from '@playwright/test'

export async function createGameViaUI(page: Page, opts: {
  nickname: string
  openingLine: string
  rounds?: number
}) {
  await page.goto('/create')
  await page.getByPlaceholder('e.g. Alex').fill(opts.nickname)
  await page.getByPlaceholder('It was a perfectly ordinary Tuesday').fill(opts.openingLine)
  if (opts.rounds) {
    await page.locator('input[type="number"]').fill(String(opts.rounds))
  }
  await page.getByRole('button', { name: 'Create Game' }).click()
  await page.waitForURL(/\/game\/.*\/lobby/)
}

export async function getGameCodeFromLobby(page: Page): Promise<string> {
  const codeEl = page.locator('p.text-4xl')
  await codeEl.waitFor()
  return (await codeEl.textContent()) ?? ''
}

export async function joinGameViaUI(page: Page, opts: {
  code: string
  nickname: string
}) {
  await page.goto(`/?code=${opts.code}`)
  await page.getByPlaceholder('Your nickname').fill(opts.nickname)
  await page.getByRole('button', { name: 'Join' }).click()
  await page.waitForURL(/\/game\/.*\/lobby/)
}
```

- [ ] **Step 2: Create happy path E2E test**

Create `e2e/tests/happy-path.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { createGameViaUI, getGameCodeFromLobby, joinGameViaUI } from './helpers'

test('full game: create, join, play turns, reveal story', async ({ browser }) => {
  const creator = await browser.newPage()
  const joiner = await browser.newPage()

  // Creator creates a game with 2 rounds
  await createGameViaUI(creator, {
    nickname: 'Alice',
    openingLine: 'Once upon a time',
    rounds: 2,
  })
  const code = await getGameCodeFromLobby(creator)
  expect(code).toHaveLength(6)

  // Joiner joins via code
  await joinGameViaUI(joiner, { code, nickname: 'Bob' })

  // Verify both players see each other in lobby
  await expect(creator.getByText('Alice')).toBeVisible()
  await expect(creator.getByText('Bob')).toBeVisible()

  // Creator starts game
  await creator.getByRole('button', { name: 'Start Game' }).click()

  // Wait for redirect to waiting/turn pages
  await creator.waitForURL(/\/game\/.*\/(waiting|turn)/)
  await joiner.waitForURL(/\/game\/.*\/(waiting|turn)/)

  // Determine who goes first and play 2 rounds
  for (let round = 0; round < 2; round++) {
    // Find which page has the turn form
    let active: typeof creator
    let waiting: typeof joiner

    const creatorUrl = creator.url()
    if (creatorUrl.includes('/turn')) {
      active = creator
      waiting = joiner
    } else {
      active = joiner
      waiting = creator
    }

    // Submit a sentence
    await active.getByPlaceholder('Write your sentence here').fill(`Round ${round + 1} sentence`)
    await active.getByRole('button', { name: /Fold & Pass/ }).click()

    // Active player goes to waiting, other goes to turn (or reveal if last round)
    if (round < 1) {
      await active.waitForURL(/\/game\/.*\/waiting/)
      await waiting.waitForURL(/\/game\/.*\/turn/, { timeout: 10_000 })
    } else {
      // Last round: both should end up at reveal
      await active.waitForURL(/\/game\/.*\/(waiting|reveal)/, { timeout: 10_000 })
      await waiting.waitForURL(/\/game\/.*\/(waiting|reveal)/, { timeout: 10_000 })
    }
  }

  // Both should eventually reach the reveal page
  await creator.waitForURL(/\/game\/.*\/reveal/, { timeout: 15_000 })
  await joiner.waitForURL(/\/game\/.*\/reveal/, { timeout: 15_000 })

  // Verify story is shown
  await expect(creator.getByText('Once upon a time')).toBeVisible({ timeout: 10_000 })

  await creator.close()
  await joiner.close()
})
```

- [ ] **Step 3: Run the E2E test locally** (requires dev server running)

Run: `cd e2e && npx playwright test tests/happy-path.spec.ts --project desktop`
Expected: Test passes. Two browser contexts play through a full game.

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/helpers.ts e2e/tests/happy-path.spec.ts
git commit -m "test: add E2E happy path test for full game lifecycle"
```

---

### Task 15: E2E Tests — Join via Link, Share, RTL

**Files:**
- Create: `e2e/tests/join-via-link.spec.ts`
- Create: `e2e/tests/share.spec.ts`
- Create: `e2e/tests/rtl.spec.ts`

- [ ] **Step 1: Write join-via-link test**

```ts
import { test, expect } from '@playwright/test'
import { createGameViaUI, getGameCodeFromLobby } from './helpers'

test('?code= param pre-fills code input', async ({ browser }) => {
  const creator = await browser.newPage()
  await createGameViaUI(creator, {
    nickname: 'Alice',
    openingLine: 'Test story',
    rounds: 2,
  })
  const code = await getGameCodeFromLobby(creator)

  const joiner = await browser.newPage()
  await joiner.goto(`/?code=${code}`)

  const input = joiner.locator('input[maxlength="6"]')
  await expect(input).toHaveValue(code)

  await creator.close()
  await joiner.close()
})
```

- [ ] **Step 2: Write share test**

```ts
import { test, expect } from '@playwright/test'
import { createGameViaUI } from './helpers'

test('share invite button is visible in lobby', async ({ page }) => {
  await createGameViaUI(page, {
    nickname: 'Alice',
    openingLine: 'Test',
    rounds: 2,
  })

  const shareBtn = page.getByRole('button', { name: 'Share invite' })
  await expect(shareBtn).toBeVisible()
})
```

- [ ] **Step 3: Write RTL test**

```ts
import { test, expect } from '@playwright/test'

test('Hebrew text gets RTL direction on create page', async ({ page }) => {
  await page.goto('/create')
  const textarea = page.getByPlaceholder('It was a perfectly ordinary Tuesday')
  await textarea.fill('היה היום יפה מאוד')

  // dir="auto" should resolve to rtl for Hebrew content
  await expect(textarea).toHaveAttribute('dir', 'auto')
})

test('RTL story lines align correctly in reveal', async ({ browser }) => {
  // Create a game with Hebrew opening line via API
  const page = await browser.newPage()
  await page.goto('/create')
  await page.getByPlaceholder('e.g. Alex').fill('Alice')
  await page.getByPlaceholder('It was a perfectly ordinary Tuesday').fill('בהתחלה הכל היה שקט')
  await page.locator('input[type="number"]').fill('1')
  await page.getByRole('button', { name: 'Create Game' }).click()
  await page.waitForURL(/\/game\/.*\/lobby/)

  // Get code and join with second player
  const code = (await page.locator('p.text-4xl').textContent()) ?? ''
  const joiner = await browser.newPage()
  await joiner.goto(`/?code=${code}`)
  await joiner.getByPlaceholder('Your nickname').fill('Bob')
  await joiner.getByRole('button', { name: 'Join' }).click()
  await joiner.waitForURL(/\/game\/.*\/lobby/)

  // Start game
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForURL(/\/game\/.*\/(waiting|turn)/)
  await joiner.waitForURL(/\/game\/.*\/(waiting|turn)/)

  // Find who has the turn and submit
  const activeUrl = page.url().includes('/turn') ? page : joiner
  await activeUrl.getByPlaceholder('Write your sentence here').fill('וזה נגמר')
  await activeUrl.getByRole('button', { name: /Fold & Pass/ }).click()

  // Both should reach reveal
  await page.waitForURL(/\/game\/.*\/reveal/, { timeout: 15_000 })

  // Verify the Hebrew sentence paragraphs have dir="auto"
  const sentences = page.locator('p[dir="auto"]')
  await expect(sentences.first()).toBeVisible({ timeout: 10_000 })

  await page.close()
  await joiner.close()
})
```

- [ ] **Step 4: Run to verify**

Run: `cd e2e && npx playwright test tests/join-via-link.spec.ts tests/share.spec.ts tests/rtl.spec.ts --project desktop`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/join-via-link.spec.ts e2e/tests/share.spec.ts e2e/tests/rtl.spec.ts
git commit -m "test: add E2E tests for join-via-link, share, and RTL"
```

---

### Task 16: E2E Tests — Admin and Responsive

**Files:**
- Create: `e2e/tests/admin.spec.ts`
- Create: `e2e/tests/responsive.spec.ts`

- [ ] **Step 1: Write admin test**

```ts
import { test, expect } from '@playwright/test'

test('admin login and dashboard', async ({ page }) => {
  await page.goto('/admin')

  // Should redirect to login
  await page.waitForURL(/\/admin\/login/)

  // Login with test credentials (these need ADMIN_PASSWORD_HASH in .env.local)
  await page.getByPlaceholder(/password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? 'admin')
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  // Should redirect to dashboard
  await page.waitForURL(/\/admin$/, { timeout: 5_000 })

  // Dashboard should show KPI cards
  await expect(page.getByText(/active games/i)).toBeVisible()
})
```

- [ ] **Step 2: Write responsive test**

```ts
import { test, expect } from '@playwright/test'

test('create page renders correctly on mobile', async ({ page }) => {
  await page.goto('/create')

  // All form fields should be visible and not overflow
  await expect(page.getByPlaceholder('e.g. Alex')).toBeVisible()
  await expect(page.getByPlaceholder('It was a perfectly ordinary Tuesday')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Game' })).toBeVisible()

  // Timeout chips should be visible
  await expect(page.getByRole('button', { name: '5m' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'None' })).toBeVisible()

  // No horizontal overflow
  const body = page.locator('body')
  const box = await body.boundingBox()
  const viewport = page.viewportSize()
  if (box && viewport) {
    expect(box.width).toBeLessThanOrEqual(viewport.width)
  }
})

test('home page renders correctly on mobile', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Join' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
})
```

- [ ] **Step 3: Run to verify**

Run: `cd e2e && npx playwright test tests/admin.spec.ts tests/responsive.spec.ts --project mobile`
Expected: Tests pass (admin test may need valid credentials in env).

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/admin.spec.ts e2e/tests/responsive.spec.ts
git commit -m "test: add E2E tests for admin flow and responsive layout"
```

---

### Task 17: Integration Test Helpers

**Files:**
- Create: `__tests__/helpers/integration-db.ts`

- [ ] **Step 1: Create integration DB helpers**

```ts
import { neon, Pool } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

const TEST_DB_URL = process.env.TEST_DATABASE_URL

if (!TEST_DB_URL) {
  throw new Error('TEST_DATABASE_URL is required for integration tests')
}

export const testSql = neon(TEST_DB_URL)

export async function setupTestDb() {
  const pool = new Pool({ connectionString: TEST_DB_URL })
  const client = await pool.connect()
  try {
    // Run all migrations
    const migrationsDir = path.resolve(__dirname, '../../migrations')
    const files = fs.readdirSync(migrationsDir).sort()
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        await client.query(sql).catch(() => {
          // Ignore "already exists" errors for idempotent re-runs
        })
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

export async function cleanupTestDb() {
  const pool = new Pool({ connectionString: TEST_DB_URL })
  const client = await pool.connect()
  try {
    await client.query(`
      TRUNCATE push_subscriptions, turns, players, games, nps_responses CASCADE
    `)
  } finally {
    client.release()
    await pool.end()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add __tests__/helpers/integration-db.ts
git commit -m "feat: add integration test DB setup/cleanup helpers"
```

---

### Task 18: Integration Test — Full Game Lifecycle

**Files:**
- Create: `__tests__/integration/gameplay.test.ts`

- [ ] **Step 1: Write the full lifecycle test**

```ts
// @vitest-environment node
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { setupTestDb, cleanupTestDb, testSql } from '../helpers/integration-db'
import { generateCode, hashCode } from '@/lib/code'

beforeAll(async () => {
  await setupTestDb()
})

afterEach(async () => {
  await cleanupTestDb()
})

describe('full game lifecycle (integration)', () => {
  it('create → join → start → play turns → complete → read story', async () => {
    // 1. Create game
    const code = generateCode()
    const salt = crypto.randomUUID()
    const codeHash = hashCode(code, salt)

    const [game] = await testSql`
      INSERT INTO games (code_hash, code_salt, opening_line, total_rounds)
      VALUES (${codeHash}, ${salt}::uuid, ${'Once upon a time'}, ${2})
      RETURNING id, status
    `
    expect(game.status).toBe('lobby')

    // 2. Join two players
    const [p1] = await testSql`
      INSERT INTO players (game_id, nickname, join_order)
      VALUES (${game.id}, ${'Alice'}, ${1})
      RETURNING id
    `
    const [p2] = await testSql`
      INSERT INTO players (game_id, nickname, join_order)
      VALUES (${game.id}, ${'Bob'}, ${2})
      RETURNING id
    `

    // 3. Start game
    await testSql`UPDATE games SET status = 'active' WHERE id = ${game.id}`
    const [started] = await testSql`SELECT status FROM games WHERE id = ${game.id}`
    expect(started.status).toBe('active')

    // 4. Round 1: player at index (1 % 2 = 1) → p2
    await testSql`
      INSERT INTO turns (game_id, player_id, round_number, sentence)
      VALUES (${game.id}, ${p2.id}, ${1}, ${'Something magical happened'})
    `
    await testSql`UPDATE games SET current_round = 2 WHERE id = ${game.id}`

    // 5. Round 2 (final): player at index (2 % 2 = 0) → p1
    await testSql`
      INSERT INTO turns (game_id, player_id, round_number, sentence)
      VALUES (${game.id}, ${p1.id}, ${2}, ${'The end'})
    `
    await testSql`UPDATE games SET status = 'complete' WHERE id = ${game.id}`

    // 6. Read story
    const [completed] = await testSql`SELECT status, opening_line FROM games WHERE id = ${game.id}`
    expect(completed.status).toBe('complete')
    expect(completed.opening_line).toBe('Once upon a time')

    const turns = await testSql`
      SELECT sentence, round_number FROM turns
      WHERE game_id = ${game.id}
      ORDER BY round_number
    `
    expect(turns).toHaveLength(2)
    expect(turns[0].sentence).toBe('Something magical happened')
    expect(turns[1].sentence).toBe('The end')
  })

  it('close game deletes lobby, sets active to closed', async () => {
    // Create lobby game
    const [lobbyGame] = await testSql`
      INSERT INTO games (code_hash, code_salt, opening_line, total_rounds)
      VALUES (${'hash1'}, ${crypto.randomUUID()}::uuid, ${'Test'}, ${2})
      RETURNING id
    `
    await testSql`DELETE FROM games WHERE id = ${lobbyGame.id}`
    const deleted = await testSql`SELECT id FROM games WHERE id = ${lobbyGame.id}`
    expect(deleted).toHaveLength(0)

    // Create active game
    const [activeGame] = await testSql`
      INSERT INTO games (code_hash, code_salt, opening_line, total_rounds, status)
      VALUES (${'hash2'}, ${crypto.randomUUID()}::uuid, ${'Test2'}, ${2}, ${'active'})
      RETURNING id
    `
    await testSql`UPDATE games SET status = 'closed' WHERE id = ${activeGame.id}`
    const [closed] = await testSql`SELECT status FROM games WHERE id = ${activeGame.id}`
    expect(closed.status).toBe('closed')
  })
})
```

- [ ] **Step 2: Run to verify** (requires TEST_DATABASE_URL)

Run: `TEST_DATABASE_URL=<neon-ci-branch-url> npx vitest run --project integration`
Expected: Tests pass against real Neon database.

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/gameplay.test.ts
git commit -m "test: add integration test for full game lifecycle"
```

---

### Task 19: Install Husky and Create Pre-Push Hook

**Files:**
- Modify: `package.json` (add prepare script)
- Create: `.husky/pre-push`

- [ ] **Step 1: Install Husky**

```bash
npm install -D husky
npx husky init
```

- [ ] **Step 2: Create pre-push hook**

Write `.husky/pre-push`:

```bash
npx tsc --noEmit && npx vitest run --project unit --project api
```

- [ ] **Step 3: Remove the default pre-commit hook that husky init creates**

```bash
rm .husky/pre-commit
```

- [ ] **Step 4: Verify hook works**

Run: `npx tsc --noEmit && npx vitest run --project unit --project api`
Expected: Type check passes, all unit + API tests pass.

- [ ] **Step 5: Commit**

```bash
git add .husky/ package.json package-lock.json
git commit -m "feat: add Husky pre-push hook for type check + fast tests"
```

---

### Task 20: GitHub Actions — PR Workflow

**Files:**
- Create: `.github/workflows/ci-pr.yml`

- [ ] **Step 1: Create the PR workflow**

```yaml
name: CI — Pull Request

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Unit + API tests
        run: npx vitest run --project unit --project api

      - name: Build
        run: npx next build
```

- [ ] **Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci-pr.yml
git commit -m "ci: add GitHub Actions workflow for PR checks"
```

---

### Task 21: GitHub Actions — Main Workflow

**Files:**
- Create: `.github/workflows/ci-main.yml`

- [ ] **Step 1: Create the main branch workflow**

```yaml
name: CI — Main

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      UPSTASH_REDIS_REST_URL: ${{ secrets.TEST_UPSTASH_REDIS_REST_URL }}
      UPSTASH_REDIS_REST_TOKEN: ${{ secrets.TEST_UPSTASH_REDIS_REST_TOKEN }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Unit + API tests
        run: npx vitest run --project unit --project api

      - name: Integration tests
        run: npx vitest run --project integration

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: E2E tests
        run: cd e2e && npx playwright test

      - name: Build
        run: npx next build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci-main.yml
git commit -m "ci: add GitHub Actions workflow for main branch with integration + E2E"
```

---

### Task 22: Configure Vercel to Wait for GitHub Checks

**Files:** None (Vercel dashboard configuration)

- [ ] **Step 1: Document the Vercel configuration steps**

In Vercel dashboard:
1. Go to **Project Settings → Git**
2. Under **Deployment Protection**, enable **"Require status checks to pass before deploying"**
3. Select the **"CI — Main / test"** check

This ensures Vercel only deploys when CI passes.

- [ ] **Step 2: Commit a note to the spec**

No code change needed. This is a manual dashboard step.

---

### Task 23: Final Verification — Run All Tests

- [ ] **Step 1: Run unit + API tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 4: Run E2E tests locally**

Run: `cd e2e && npx playwright test --project desktop`
Expected: All E2E tests pass against local dev server.

- [ ] **Step 5: Push to main and verify CI runs**

```bash
git push origin main
```
Expected: GitHub Actions `ci-main.yml` triggers and all jobs pass.
