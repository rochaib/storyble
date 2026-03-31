type Props = {
  className?: string
}

export function StorybleLogo({ className }: Props) {
  return (
    <svg
      width="220"
      height="48"
      viewBox="0 0 220 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Storyble"
      className={className}
    >
      {/* Speech bubble body — dark in light mode, light in dark mode */}
      <rect x="2" y="2" width="42" height="36" rx="9" className="fill-[#1a1a2e] dark:fill-[#f1f5f9]" />
      {/* Bubble tail */}
      <polygon points="6,36 14,36 6,44" className="fill-[#1a1a2e] dark:fill-[#f1f5f9]" />
      {/* Dog-ear fold — always red */}
      <polygon points="33,38 44,38 44,27" fill="#e94560" />
      <polygon points="33,38 44,27 33,27" fill="#c7304d" opacity="0.5" />
      {/* Three dots — white in light mode, dark in dark mode */}
      <circle cx="15" cy="19" r="2.8" className="fill-white dark:fill-[#1a1a2e]" />
      <circle cx="23" cy="19" r="2.8" className="fill-white dark:fill-[#1a1a2e]" />
      <circle cx="31" cy="19" r="2.8" className="fill-white dark:fill-[#1a1a2e]" />
      {/* Wordmark — dark in light mode, white in dark mode */}
      <text
        x="56"
        y="30"
        fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="22"
        letterSpacing="-0.5"
        className="fill-[#1a1a2e] dark:fill-white"
      >
        Storyble
      </text>
    </svg>
  )
}
