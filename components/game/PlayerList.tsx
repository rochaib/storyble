import type { Player } from '@/types'

type Props = {
  players: Pick<Player, 'id' | 'nickname' | 'join_order'>[]
  currentPlayerId?: string
}

export function PlayerList({ players, currentPlayerId }: Props) {
  return (
    <ul className="flex flex-col gap-2 w-full">
      {players.map(p => (
        <li
          key={p.id}
          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-100 dark:bg-[#0f3460] text-slate-700 dark:text-slate-200 text-sm"
        >
          <span className="text-slate-400 text-xs w-4">{p.join_order}.</span>
          <span className="flex-1">{p.nickname}</span>
          {p.id === currentPlayerId && (
            <span className="text-xs text-slate-400 dark:text-slate-500">you</span>
          )}
        </li>
      ))}
    </ul>
  )
}
