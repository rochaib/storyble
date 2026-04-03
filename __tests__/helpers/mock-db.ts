import { vi } from 'vitest'

type QueryResult = Record<string, unknown>[]

type QueryMatcher = {
  pattern: RegExp
  result: QueryResult
}

export function createMockSql() {
  const matchers: QueryMatcher[] = []

  const sql = vi.fn((...args: unknown[]) => {
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
