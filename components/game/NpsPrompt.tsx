'use client'
import { useState, useEffect } from 'react'

const NPS_KEY = 'fold_nps_submitted'

export function NpsPrompt() {
  const [submitted, setSubmitted] = useState(true) // hide by default until mounted
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSubmitted(!!localStorage.getItem(NPS_KEY))
  }, [])

  async function handleSubmit() {
    if (selected === null) return
    setLoading(true)
    try {
      await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: selected }),
      })
      localStorage.setItem(NPS_KEY, '1')
      setSubmitted(true)
    } catch (err) {
      console.error('NPS submit failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return null

  return (
    <div className="bg-slate-100 dark:bg-[#0f3460] rounded-lg p-4 flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
        Would you recommend Storyble to a friend?
      </p>
      <div className="flex justify-between gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            aria-label={`Score ${i}`}
            className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
              selected === i
                ? 'bg-[#e94560] text-white'
                : 'bg-white dark:bg-[#1a1a2e] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={selected === null || loading}
        className="py-2 rounded-lg bg-[#e94560] text-white text-sm font-bold disabled:opacity-40 transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  )
}
