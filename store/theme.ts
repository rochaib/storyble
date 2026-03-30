import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeStore = {
  theme: 'light' | 'dark'
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'fold-pass-theme' }
  )
)
