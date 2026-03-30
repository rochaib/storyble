'use client'
import { useEffect, useState } from 'react'
import { useThemeStore } from '@/store/theme'

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme, mounted])

  if (!mounted) {
    return <span className="w-7 h-7 inline-block" aria-hidden />
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-lg"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
