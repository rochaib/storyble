import { ThemeToggle } from './ThemeToggle'
import { StorybleLogo } from './StorybleLogo'

type TopBarProps = {
  right?: React.ReactNode
}

export function TopBar({ right }: TopBarProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <StorybleLogo />
      <div className="flex items-center gap-3">
        {right}
        <ThemeToggle />
      </div>
    </div>
  )
}
