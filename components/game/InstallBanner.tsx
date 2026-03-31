'use client'
import { useEffect, useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { usePushSubscription } from '@/hooks/usePushSubscription'

export function InstallBanner() {
  const { canPrompt, triggerPrompt, dismiss } = useInstallPrompt()
  const { subscribe } = usePushSubscription()
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPlayerId(sessionStorage.getItem('fold_player_id'))
    }
  }, [])

  if (!canPrompt) return null

  function handleInstall() {
    // If playerId is null (session cleared), install without push subscription —
    // user can manually re-join a game to receive notifications.
    triggerPrompt(playerId ? () => subscribe(playerId!) : undefined)
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-[#0f3460] rounded-lg p-4">
      <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">
        Enjoyed the game? Install Storyble for notifications when it&apos;s your turn.
      </p>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg bg-[#e94560] text-white text-xs font-bold"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="px-3 py-1.5 rounded-lg text-slate-400 text-xs"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
