'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'

type StoryData = {
  game: {
    id: string
    status: string
    opening_line: string
    total_rounds: number
    created_at: string
  }
  turns: Array<{
    sentence: string
    round_number: number
    submitted_at: string
    nickname: string
  }>
}

const COLORS = ['#e94560', '#7c3aed', '#059669', '#d97706', '#0ea5e9']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

export default function AdminStoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [story, setStory] = useState<StoryData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/admin/api/games/${id}/story`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setError(data.error ?? 'Not found'); return }
        const story = data as StoryData
        if (!story.game?.id) { setError('Invalid response from server'); return }
        setStory(story)
      })
      .catch(err => {
        console.error('Story fetch failed:', err)
        setError('Could not load story')
      })
  }, [id])

  if (error) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-8">
        <TopBar />
        <p className="text-red-500 text-center mt-16">{error}</p>
        <div className="text-center mt-4">
          <button onClick={() => router.push('/admin')} className="text-[#e94560] text-sm underline">
            ← Back to dashboard
          </button>
        </div>
      </main>
    )
  }

  const entries = story
    ? [
        { key: 'opening', sentence: story.game.opening_line, label: 'Opening', timestamp: story.game.created_at },
        ...story.turns.map(t => ({
          key: `round-${t.round_number}`,
          sentence: t.sentence,
          label: t.nickname,
          timestamp: t.submitted_at,
        })),
      ]
    : []

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <TopBar
        right={
          <button
            onClick={() => router.push('/admin')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Dashboard
          </button>
        }
      />

      {story ? (
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-slate-800">Story</h1>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
              {story.game.status}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {entries.map((entry, i) => (
              <div
                key={entry.key}
                className="rounded-lg px-4 py-3 bg-white border border-slate-200"
                style={{ borderLeftWidth: '3px', borderLeftColor: COLORS[i % COLORS.length] }}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                    {entry.label}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span>
                </div>
                <p className="text-slate-700 text-sm italic leading-relaxed">
                  &ldquo;{entry.sentence}&rdquo;
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center mt-2">
            {story.turns.length} turn{story.turns.length !== 1 ? 's' : ''} — created {formatDate(story.game.created_at)}
          </p>
        </div>
      ) : (
        <p className="text-slate-400 text-center mt-16">Loading story…</p>
      )}
    </main>
  )
}
