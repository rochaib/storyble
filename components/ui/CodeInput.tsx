'use client'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function CodeInput({ value, onChange, placeholder = 'ABC123' }: Props) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
      placeholder={placeholder}
      maxLength={6}
      autoCapitalize="characters"
      autoCorrect="off"
      className="w-48 text-center text-3xl font-bold tracking-widest py-3 px-4 rounded-lg border-2 border-[#e94560] bg-white dark:bg-[#0f3460] text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#e94560]/50"
    />
  )
}
