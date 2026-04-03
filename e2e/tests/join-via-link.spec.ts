import { test, expect } from '@playwright/test'
import { createGameViaUI, getGameCodeFromLobby } from './helpers'

test('?code= param pre-fills code input', async ({ browser }) => {
  const creator = await browser.newPage()
  await createGameViaUI(creator, {
    nickname: 'Alice',
    openingLine: 'Test story',
    rounds: 2,
  })
  const code = await getGameCodeFromLobby(creator)

  const joiner = await browser.newPage()
  await joiner.goto(`/?code=${code}`)

  const input = joiner.locator('input[maxlength="6"]')
  await expect(input).toHaveValue(code)

  await creator.close()
  await joiner.close()
})
