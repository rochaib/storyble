import { test, expect } from '@playwright/test'
import { createGameViaUI, getGameCodeFromLobby, joinGameViaUI } from './helpers'

test('full game: create, join, play turns, reveal story', async ({ browser }) => {
  const creator = await browser.newPage()
  const joiner = await browser.newPage()

  // Creator creates a game with 2 rounds
  await createGameViaUI(creator, {
    nickname: 'Alice',
    openingLine: 'Once upon a time',
    rounds: 2,
  })
  const code = await getGameCodeFromLobby(creator)
  expect(code).toHaveLength(6)

  // Joiner joins via code
  await joinGameViaUI(joiner, { code, nickname: 'Bob' })

  // Verify both players see each other in lobby
  await expect(creator.getByText('Alice')).toBeVisible()
  await expect(creator.getByText('Bob')).toBeVisible()

  // Creator starts game
  await creator.getByRole('button', { name: 'Start Game' }).click()

  // Wait for redirect to waiting/turn pages
  await creator.waitForURL(/\/game\/.*\/(waiting|turn)/)
  await joiner.waitForURL(/\/game\/.*\/(waiting|turn)/)

  // Determine who goes first and play 2 rounds
  for (let round = 0; round < 2; round++) {
    let active: typeof creator
    let waiting: typeof joiner

    const creatorUrl = creator.url()
    if (creatorUrl.includes('/turn')) {
      active = creator
      waiting = joiner
    } else {
      active = joiner
      waiting = creator
    }

    await active.getByPlaceholder('Write your sentence here').fill(`Round ${round + 1} sentence`)
    await active.getByRole('button', { name: /Fold & Pass/ }).click()

    if (round < 1) {
      await active.waitForURL(/\/game\/.*\/waiting/)
      await waiting.waitForURL(/\/game\/.*\/turn/, { timeout: 10_000 })
    } else {
      await active.waitForURL(/\/game\/.*\/(waiting|reveal)/, { timeout: 10_000 })
      await waiting.waitForURL(/\/game\/.*\/(waiting|reveal)/, { timeout: 10_000 })
    }
  }

  await creator.waitForURL(/\/game\/.*\/reveal/, { timeout: 15_000 })
  await joiner.waitForURL(/\/game\/.*\/reveal/, { timeout: 15_000 })
  await expect(creator.getByText('Once upon a time')).toBeVisible({ timeout: 10_000 })

  await creator.close()
  await joiner.close()
})
