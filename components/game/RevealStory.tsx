'use client'
import { useEffect, useState } from 'react'

type Entry = { sentence: string; nickname?: string; isOpening?: boolean }

type Props = {
  entries: Entry[]
  onAllRevealed?: () => void
}

const COLORS = ['#e94560', '#7c3aed', '#059669', '#d97706', '#0ea5e9']

export function RevealStory({ entries, onAllRevealed }: Props) {
  const [revealed, setRevealed] = useState(0)
  const [named, setNamed] = useState(true)
  const [fastForward, setFastForward] = useState(false)

  useEffect(() => {
    if (fastForward) {
      setRevealed(entries.length)
      // Don't call onAllRevealed here — let the revealed >= entries.length branch handle it
      return
    }
    if (revealed >= entries.length) {
      if (revealed > 0) onAllRevealed?.()
      return
    }
    const t = setTimeout(() => setRevealed(r => r + 1), 1200)
    return () => clearTimeout(t)
  }, [revealed, entries.length, fastForward, onAllRevealed])

  const progress = entries.length > 0 ? Math.round((revealed / entries.length) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Named/Anonymous toggle */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#e94560] uppercase tracking-widest">📖 The Story</span>
        <div className="flex bg-slate-100 dark:bg-[#0f3460] rounded-full p-0.5 text-xs">
          <button
            onClick={() => setNamed(true)}
            className={`px-3 py-1 rounded-full transition-colors ${named ? 'bg-[#e94560] text-white' : 'text-slate-500'}`}
          >
            Named
          </button>
          <button
            onClick={() => setNamed(false)}
            className={`px-3 py-1 rounded-full transition-colors ${!named ? 'bg-[#e94560] text-white' : 'text-slate-500'}`}
          >
            Anonymous
          </button>
        </div>
      </div>

      {/* Sentences */}
      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div
            key={i}
            className={`transition-opacity duration-500 ${i < revealed ? 'opacity-100' : 'opacity-0'}`}
          >
            {i < revealed && (
              <div
                className="rounded-lg px-4 py-3 bg-[#0f3460]/10 dark:bg-[#0f3460]"
                style={{ borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}
              >
                {named && (
                  <p className="text-xs mb-1" style={{ color: COLORS[i % COLORS.length] }}>
                    {entry.isOpening ? 'Opening:' : `${entry.nickname}:`}
                  </p>
                )}
                <p className="text-slate-700 dark:text-slate-100 text-sm italic leading-relaxed">
                  &ldquo;{entry.sentence}&rdquo;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar + fast-forward */}
      <div className="bg-white dark:bg-[#111827] rounded-lg p-3 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">{revealed} of {entries.length}</span>
          {revealed < entries.length && (
            <button
              onClick={() => setFastForward(true)}
              className="text-xs text-slate-400 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded hover:text-slate-600 transition-colors"
            >
              ⏭ Reveal all
            </button>
          )}
        </div>
        <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-1">
          <div
            className="bg-[#e94560] h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
