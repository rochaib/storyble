'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed'); return }
      router.push('/admin')
    } catch (err) {
      console.error('Admin login failed:', err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <p className="text-[#e94560] font-bold tracking-widest text-sm uppercase">Storyble</p>
          <p className="text-slate-400 text-xs mt-1">/ admin</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full py-3 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm outline-none focus:border-[#e94560]"
          />
          {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={!password || loading}
            className="py-3 rounded-lg bg-[#e94560] text-white font-bold hover:bg-[#c73652] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}
