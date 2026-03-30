'use client'
import { useState } from 'react'

const REACTIONS = ['😂', '😮', '🔥', '💀']

export function ReactionBar() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex justify-center gap-5 py-3">
      {REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => setSelected(emoji)}
          aria-label={`React with ${emoji}`}
          className={`text-2xl transition-transform hover:scale-125 ${selected === emoji ? 'scale-125' : ''}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
