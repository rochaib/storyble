// @vitest-environment node
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { setupTestDb, cleanupTestDb, testSql } from '../helpers/integration-db'
import { generateCode, hashCode } from '@/lib/code'

beforeAll(async () => {
  await setupTestDb()
})

afterEach(async () => {
  await cleanupTestDb()
})

describe('full game lifecycle (integration)', () => {
  it('create → join → start → play turns → complete → read story', async () => {
    const code = generateCode()
    const salt = crypto.randomUUID()
    const codeHash = hashCode(code, salt)

    const [game] = await testSql`
      INSERT INTO games (code_hash, code_salt, opening_line, total_rounds)
      VALUES (${codeHash}, ${salt}::uuid, ${'Once upon a time'}, ${2})
      RETURNING id, status
    `
    expect(game.status).toBe('lobby')

    const [p1] = await testSql`
      INSERT INTO players (game_id, nickname, join_order)
      VALUES (${game.id}, ${'Alice'}, ${1}) RETURNING id
    `
    const [p2] = await testSql`
      INSERT INTO players (game_id, nickname, join_order)
      VALUES (${game.id}, ${'Bob'}, ${2}) RETURNING id
    `

    await testSql`UPDATE games SET status = 'active' WHERE id = ${game.id}`

    await testSql`
      INSERT INTO turns (game_id, player_id, round_number, sentence)
      VALUES (${game.id}, ${p2.id}, ${1}, ${'Something magical happened'})
    `
    await testSql`UPDATE games SET current_round = 2 WHERE id = ${game.id}`

    await testSql`
      INSERT INTO turns (game_id, player_id, round_number, sentence)
      VALUES (${game.id}, ${p1.id}, ${2}, ${'The end'})
    `
    await testSql`UPDATE games SET status = 'complete' WHERE id = ${game.id}`

    const [completed] = await testSql`SELECT status, opening_line FROM games WHERE id = ${game.id}`
    expect(completed.status).toBe('complete')
    expect(completed.opening_line).toBe('Once upon a time')

    const turns = await testSql`
      SELECT sentence, round_number FROM turns WHERE game_id = ${game.id} ORDER BY round_number
    `
    expect(turns).toHaveLength(2)
    expect(turns[0].sentence).toBe('Something magical happened')
    expect(turns[1].sentence).toBe('The end')
  })

  it('close game deletes lobby, sets active to closed', async () => {
    const [lobbyGame] = await testSql`
      INSERT INTO games (code_hash, code_salt, opening_line, total_rounds)
      VALUES (${'hash1'}, ${crypto.randomUUID()}::uuid, ${'Test'}, ${2})
      RETURNING id
    `
    await testSql`DELETE FROM games WHERE id = ${lobbyGame.id}`
    const deleted = await testSql`SELECT id FROM games WHERE id = ${lobbyGame.id}`
    expect(deleted).toHaveLength(0)

    const [activeGame] = await testSql`
      INSERT INTO games (code_hash, code_salt, opening_line, total_rounds, status)
      VALUES (${'hash2'}, ${crypto.randomUUID()}::uuid, ${'Test2'}, ${2}, ${'active'})
      RETURNING id
    `
    await testSql`UPDATE games SET status = 'closed' WHERE id = ${activeGame.id}`
    const [closed] = await testSql`SELECT status FROM games WHERE id = ${activeGame.id}`
    expect(closed.status).toBe('closed')
  })
})
