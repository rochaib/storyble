'use client'

type Props = {
  value: number
  onChange: (v: number) => void
}

export function RoundsInput({ value, onChange }: Props) {
  const isWarning = value > 500
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Number of rounds
      </label>
      <input
        type="number"
        min={1}
        max={1000}
        value={value}
        onChange={e => {
          const n = Math.min(1000, Math.max(1, parseInt(e.target.value) || 1))
          onChange(n)
        }}
        className="w-32 text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#0f3460] text-slate-800 dark:text-white outline-none"
      />
      {isWarning && (
        <p className="text-red-500 text-xs">Getting a bit long…</p>
      )}
    </div>
  )
}
