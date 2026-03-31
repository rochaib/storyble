import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Storyble',
  description: 'The collaborative folded story game',
  manifest: '/manifest.json',
  themeColor: '#e94560',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 dark:bg-[#1a1a2e] min-h-screen transition-colors flex flex-col`}>
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600">
          collaboratively created by{' '}
          <a
            href="https://www.linkedin.com/in/rochai-b-960a9837/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e94560] hover:underline"
          >
            @rochai
          </a>{' '}
          and{' '}
          <a
            href="https://www.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e94560] hover:underline"
          >
            Claude
          </a>
        </footer>
      </body>
    </html>
  )
}
