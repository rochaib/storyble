import { ThemeToggle } from './ThemeToggle'

type TopBarProps = {
  right?: React.ReactNode
}

export function TopBar({ right }: TopBarProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <span className="text-[#e94560] font-bold tracking-widest text-sm uppercase">
        Fold &amp; Pass
      </span>
      <div className="flex items-center gap-3">
        {right}
        <ThemeToggle />
      </div>
    </div>
  )
}
