import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

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
