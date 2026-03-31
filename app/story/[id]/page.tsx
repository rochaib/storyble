'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'

type StoryData = {
  opening_line: string
  turns: { sentence: string; nickname: string; round_number: number }[]
}

const COLORS = ['#e94560', '#7c3aed', '#059669', '#d97706', '#0ea5e9']

export default function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [story, setStory] = useState<StoryData | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/games/${id}/story`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) setError(data.error ?? 'Story not found')
        else setStory(data as StoryData)
      })
      .catch(() => setError('Could not load story'))
  }, [id])

  function handleShare() {
    const url = window.location.href
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      navigator.share({ title: 'Our Storyble story', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
  }

  const entries = story
    ? [
        { sentence: story.opening_line, isOpening: true, nickname: undefined },
        ...story.turns.map(t => ({ sentence: t.sentence, nickname: t.nickname, isOpening: false })),
      ]
    : []

  if (error) {
    return (
      <main className="max-w-sm mx-auto px-6 py-8">
        <TopBar />
        <div className="text-center mt-16">
          <p className="text-slate-500 dark:text-slate-400">{error}</p>
          <button onClick={() => router.push('/')} className="mt-4 text-[#e94560] text-sm underline">
            Go home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-8 pb-16">
      <TopBar />

      {story ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#e94560] uppercase tracking-widest">📖 The Story</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {entries.length} sentences
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg px-4 py-3 bg-slate-50 dark:bg-[#0f3460]"
                style={{ borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}
              >
                <p className="text-xs mb-1" style={{ color: COLORS[i % COLORS.length] }}>
                  {entry.isOpening ? 'Opening:' : `${entry.nickname}:`}
                </p>
                <p className="text-slate-700 dark:text-slate-100 text-sm italic leading-relaxed">
                  &ldquo;{entry.sentence}&rdquo;
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleShare}
              className="w-full py-3 rounded-lg border-2 border-[#e94560] text-[#e94560] font-bold text-sm hover:bg-[#e94560] hover:text-white transition-colors"
            >
              {copied ? 'Link copied!' : 'Share this story'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-lg bg-slate-100 dark:bg-[#0f3460] text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-[#1a3a6e] transition-colors"
            >
              Play Storyble
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-400 text-center mt-16">Loading story…</p>
      )}
    </main>
  )
}
