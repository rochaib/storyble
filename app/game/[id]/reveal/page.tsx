'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/ui/TopBar'
import { RevealStory } from '@/components/game/RevealStory'
import { ReactionBar } from '@/components/game/ReactionBar'
import { NpsPrompt } from '@/components/game/NpsPrompt'
import { InstallBanner } from '@/components/game/InstallBanner'

type Story = {
  opening_line: string
  turns: { sentence: string; nickname: string; round_number: number }[]
}

type Entry = { sentence: string; nickname?: string; isOpening?: boolean }

export default function RevealPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [error, setError] = useState('')
  const [allRevealed, setAllRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/games/${id}/story`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) setError(data.error ?? 'Could not load story')
        else setStory(data as Story)
      })
      .catch(err => {
        console.error('Story fetch failed:', err)
        setError('Could not load story')
      })
  }, [id])

  const entries: Entry[] = story
    ? [
        { sentence: story.opening_line, isOpening: true },
        ...story.turns.map(t => ({ sentence: t.sentence, nickname: t.nickname })),
      ]
    : []

  function handleShare() {
    const url = `${window.location.origin}/story/${id}`
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

  if (error) {
    return (
      <main className="max-w-sm mx-auto px-6 py-8">
        <TopBar />
        <p className="text-red-500 text-center mt-16">{error}</p>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-8">
      <TopBar />
      {story ? (
        <div className="flex flex-col gap-5">
          <RevealStory entries={entries} onAllRevealed={() => setAllRevealed(true)} />
          {allRevealed && (
            <>
              <ReactionBar />
              <button
                onClick={handleShare}
                className="w-full py-3 rounded-lg border-2 border-[#e94560] text-[#e94560] font-bold text-sm hover:bg-[#e94560] hover:text-white transition-colors"
              >
                {copied ? 'Link copied!' : 'Share Story'}
              </button>
              <NpsPrompt />
              <InstallBanner />
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 rounded-lg bg-slate-100 dark:bg-[#0f3460] text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-[#1a3a6e] transition-colors"
              >
                Play again
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-slate-400 text-center mt-16">Loading story…</p>
      )}
    </main>
  )
}
