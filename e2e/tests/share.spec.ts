import { test, expect } from '@playwright/test'
import { createGameViaUI } from './helpers'

test('share invite button is visible in lobby', async ({ page }) => {
  await createGameViaUI(page, {
    nickname: 'Alice',
    openingLine: 'Test',
    rounds: 2,
  })

  const shareBtn = page.getByRole('button', { name: 'Share invite' })
  await expect(shareBtn).toBeVisible()
})
