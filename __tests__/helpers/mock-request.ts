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
