'use client'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function triggerPrompt() {
    if (!promptEvent) return
    await promptEvent.prompt()
    setPromptEvent(null)
  }

  function dismiss() {
    setDismissed(true)
  }

  const isAndroid = typeof navigator !== 'undefined' &&
    /android/i.test(navigator.userAgent)

  return {
    canPrompt: !!promptEvent && isAndroid && !dismissed,
    triggerPrompt,
    dismiss,
  }
}
