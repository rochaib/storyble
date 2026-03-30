'use client'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export function InstallBanner() {
  const { canPrompt, triggerPrompt, dismiss } = useInstallPrompt()

  if (!canPrompt) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-[#0f3460] rounded-lg p-4">
      <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">
        Enjoyed the game? Install Fold &amp; Pass for notifications when it&apos;s your turn.
      </p>
      <div className="flex flex-col gap-1">
        <button
          onClick={triggerPrompt}
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
