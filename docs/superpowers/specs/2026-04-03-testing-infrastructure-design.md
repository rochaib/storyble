# Testing Infrastructure Design

**Date:** 2026-04-03
**Status:** Draft
**Scope:** Pre-deployment testing pipeline for Storyble (fold-and-pass)

## Overview

A four-layer testing infrastructure that gates every deployment with automated quality checks. Fast mocked tests run on every PR for quick feedback. Real integration and E2E tests run on push to main before Vercel deploys to production.

## Test Layers

| Layer | Runner | Trigger | What it validates |
|---|---|---|---|
| Unit | Vitest | Every PR + main | Pure functions: code generation, hashing, auth, validation |
| API (mocked) | Vitest | Every PR + main | Route handlers: request/response contracts, validation, error paths, status codes |
| Integration | Vitest | Push to main only | Full gameplay flows against real Neon branch + Upstash |
| E2E | Playwright | Push to main only | Browser-based flows: create, join, play, reveal, share, admin, RTL, responsive |

## CI Pipeline

### PR workflow (`ci-pr.yml`)

Runs on every pull request:

1. Checkout + setup Node 22
2. `npm ci`
3. `tsc --noEmit` (type check)
4. `vitest run --project unit,api` (unit + mocked API tests)
5. `next build` (build validation)

### Main workflow (`ci-main.yml`)

Runs on push to main, gates Vercel deploy:

1. Checkout + setup Node 22
2. `npm ci`
3. `tsc --noEmit`
4. `vitest run --project unit,api`
5. `vitest run --project integration` (real Neon + Upstash)
6. Playwright install + run (starts dev server, runs E2E)
7. `next build`

Vercel is configured to wait for GitHub checks — deploy is blocked if CI fails.

### Local pre-push hook

A git pre-push hook runs before every push:

```
npx tsc --noEmit && npx vitest run --project unit,api
```

Blocks push if types or fast tests fail. No DB or browser required locally.

## Directory Structure

```
vitest.config.ts              <- workspace config with 3 projects
__tests__/
  unit/                       <- pure function tests
    lib/
      auth.test.ts            (exists)
      code.test.ts            (exists)
      ratelimit.test.ts
      db.test.ts
  api/                        <- mocked route handler tests
    games/
      create.test.ts
      join.test.ts
      poll.test.ts
      start.test.ts
      turn.test.ts
      submit.test.ts
      close.test.ts
      story.test.ts
    cron/
      timeout.test.ts
    nps.test.ts
    admin/
      login.test.ts
      dashboard.test.ts
      games.test.ts
  integration/                <- real DB tests
    gameplay.test.ts
    timeout.test.ts
    ratelimit.test.ts
  helpers/
    mock-db.ts                <- shared DB mock factory
    mock-redis.ts             <- shared Redis mock factory
    mock-request.ts           <- NextRequest builder helper
e2e/
  playwright.config.ts
  tests/
    happy-path.spec.ts
    join-via-link.spec.ts
    share.spec.ts
    rtl.spec.ts
    admin.spec.ts
    responsive.spec.ts
```

## Vitest Configuration

Three Vitest projects defined in a workspace config:

- **unit**: environment `node`, includes `__tests__/unit/**`
- **api**: environment `node`, includes `__tests__/api/**`, sets up module mocks for `@neondatabase/serverless` and `@upstash/redis`
- **integration**: environment `node`, includes `__tests__/integration/**`, requires `TEST_DATABASE_URL` and `TEST_UPSTASH_*` env vars

## Playwright Configuration

- Base URL: `http://localhost:3000`
- Browser: Chromium only (mobile covered via viewport emulation)
- Two projects: `mobile` (390x844) and `desktop` (1280x720)
- Web server: auto-starts `npm run dev` before tests
- Test timeout: 30s per test

## Mock Strategy

### DB mock (`helpers/mock-db.ts`)

Factory that returns a mock `sql` tagged template function. Tests seed it with expected queries and responses:

```ts
const mockSql = createMockSql()
mockSql.whenQuery(/SELECT COUNT.*FROM games/).returns([{ count: 0 }])
mockSql.whenQuery(/INSERT INTO games/).returns([{ id: 'uuid-1', status: 'lobby' }])
```

Injected via `vi.mock('@/lib/db', ...)` at the top of each API test file.

### Redis mock (`helpers/mock-redis.ts`)

Returns `{ success: true }` by default (rate limit passes). Tests that verify rate limiting override to return `{ success: false }`.

### Request mock (`helpers/mock-request.ts`)

Builder for constructing `NextRequest` objects:

```ts
const req = mockRequest.post('/api/games', {
  body: { opening_line: 'Once upon...', total_rounds: 3 },
  headers: { 'x-forwarded-for': '1.2.3.4' },
})
```

### Integration test helpers

- `setupTestDb()` — runs migrations against `TEST_DATABASE_URL`
- `cleanupTestDb()` — truncates all tables between tests
- No mocks — uses real `neon()` and real `Redis`

### Playwright helpers

- `createGameViaApi()` — calls API directly to set up game state (avoids repetitive UI for tests focusing on later flows)
- `joinGameViaApi()` — same for joining

## Test Coverage Map

### Unit tests

| File | Tests |
|---|---|
| `lib/code.ts` | generateCode (length, charset), hashCode (deterministic), verifyCode (case-insensitive) |
| `lib/auth.ts` | verifyAdminPassword (valid/invalid), createSessionToken (claims), verifySessionToken (valid/expired/invalid) |
| `lib/ratelimit.ts` | Rate limiter instances configured with correct windows |
| `lib/db.ts` | Falls back to storage_DATABASE_URL when DATABASE_URL missing |

### API route tests (mocked)

| Route | Key test cases |
|---|---|
| `POST /api/games` | Valid creation, missing opening_line, invalid total_rounds, rate limit hit, 500-game cap |
| `POST /api/games/join` | Valid join, invalid code, lobby expired, duplicate join |
| `GET /api/games/[id]` | Correct state returned, 404 for missing, lobby auto-expiry |
| `POST /api/games/[id]/start` | Creator starts, non-creator rejected, <2 players rejected |
| `GET /api/games/[id]/turn` | Correct previous sentence, wrong player rejected, game not active |
| `POST /api/turns` | Submit sentence, advances round, completes game on final round |
| `POST /api/games/[id]/close` | Creator closes, non-creator rejected, status transitions |
| `GET /api/games/[id]/story` | Returns story for complete game, 403 for active game |
| `GET /api/cron/timeout` | Auth check, timeout logic, player deactivation, game expiry |
| `POST /api/nps` | Valid score (0-10), out-of-range rejected |
| Admin routes | Auth middleware, dashboard stats, game management actions |

### Integration tests (real Neon + Upstash)

| Test | Flow |
|---|---|
| Full game lifecycle | Create -> join (2 players) -> start -> alternate turns -> complete -> read story |
| Timeout scenario | Create with timeout, verify cron marks player inactive |
| Close game | Creator closes mid-game, status transitions correctly |
| Lobby expiry | Game with <2 players auto-deleted after 5 min |
| Rate limiting | Verify Upstash blocks after threshold |

### E2E tests (Playwright)

| Test | Flow |
|---|---|
| Happy path | Create game -> share link -> join as P2 -> take turns -> story reveal |
| Join via link | Open `?code=ABCD12` URL -> code pre-filled -> join |
| Share flow | Lobby share button triggers clipboard copy |
| RTL | Hebrew opening line -> verify right-alignment on turn + reveal pages |
| Admin | Login -> dashboard loads -> view game detail |
| Responsive | Critical flows at iPhone 12 (390x844) and desktop (1280x720) viewports |

## External Dependencies for CI

### GitHub Secrets

| Secret | Purpose |
|---|---|
| `TEST_DATABASE_URL` | Neon `ci-test` branch connection string |
| `TEST_UPSTASH_REDIS_REST_URL` | Dedicated test Redis instance URL |
| `TEST_UPSTASH_REDIS_REST_TOKEN` | Token for test Redis instance |

### Neon CI Branch

A persistent `ci-test` branch created from main in Neon. Integration tests run migrations at start, then truncate tables after each test. Avoids creating/destroying branches per run.

## Package Changes

### New dependencies

- `@playwright/test` (devDependency) — E2E test runner
- `husky` (devDependency) — git hooks management

### New scripts in package.json

```json
{
  "test": "vitest run --project unit,api",
  "test:unit": "vitest run --project unit",
  "test:api": "vitest run --project api",
  "test:integration": "vitest run --project integration",
  "test:e2e": "npx playwright test",
  "test:all": "vitest run && npx playwright test",
  "typecheck": "tsc --noEmit",
  "prepare": "husky"
}
```
