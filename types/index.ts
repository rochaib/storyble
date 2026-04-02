export type GameStatus =
  | 'lobby' | 'active' | 'complete'
  | 'expired' | 'archived' | 'locked' | 'closed'

export type Game = {
  id: string
  code_hash: string
  code_salt: string
  status: GameStatus
  opening_line: string
  total_rounds: number
  timeout_minutes: number | null
  current_round: number
  created_at: string
}

export type Player = {
  id: string
  game_id: string
  nickname: string
  join_order: number
  is_active: boolean
}

export type Turn = {
  id: string
  game_id: string
  player_id: string
  round_number: number
  sentence: string
  submitted_at: string
}

export type GamePollResponse = {
  game: Pick<Game, 'id' | 'status' | 'total_rounds' | 'current_round'>
  players: Pick<Player, 'id' | 'nickname' | 'join_order' | 'is_active'>[]
  current_player_id: string | null
}
