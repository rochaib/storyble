import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.storage_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.storage_KV_REST_API_TOKEN!,
})

export const rateLimits = {
  createGame: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'rl:create',
  }),
  joinGame: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:join',
  }),
  submitTurn: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:turn',
  }),
  pollGame: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:poll',
  }),
  closeGame: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:close',
  }),
}
