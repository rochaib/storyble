type Props = { sentence: string; label?: string }

export function SentenceCard({ sentence, label = 'Previous sentence' }: Props) {
  return (
    <div className="border-l-4 border-[#e94560] rounded-r-lg bg-[#0f3460]/10 dark:bg-[#0f3460] px-4 py-4">
      <p className="text-xs text-[#e94560] uppercase tracking-widest mb-2">{label}</p>
      <p dir="auto" className="text-slate-700 dark:text-slate-100 text-base italic leading-relaxed">
        &ldquo;{sentence}&rdquo;
      </p>
    </div>
  )
}
