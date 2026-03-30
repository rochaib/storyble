'use client'
import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme'

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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
