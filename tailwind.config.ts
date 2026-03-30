import type { Config } from 'tailwindcss'

// NOTE: This project uses Tailwind v4 which uses CSS-based config (globals.css).
// Dark mode class variant is configured via @variant dark in globals.css.
// This file documents the intended config for reference.
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
}

export default config
