import { test, expect } from '@playwright/test'

test('Download PDF button triggers window.print()', async ({ page }) => {
  // Visit the public story page (doesn't require a real game — we test button behavior)
  // We'll use the create page which also has no auth and has a known layout
  // But the PDF button is on /story/[id] and /game/[id]/reveal — both need a real game.
  // Instead, intercept window.print on any page that has the button.

  // Spy on window.print before navigating
  let printCalled = false
  await page.exposeFunction('__onPrintCalled', () => {
    printCalled = true
  })

  await page.addInitScript(() => {
    window.print = () => {
      // @ts-expect-error — injected by exposeFunction
      window.__onPrintCalled()
    }
  })

  // Create a minimal game to reach the story page
  // Use API directly to avoid timeout issues
  const createRes = await page.request.post('/api/games', {
    data: { opening_line: 'Print test story', total_rounds: 1 },
  })
  const { game_id, code } = await createRes.json()

  // Join two players
  const join1 = await page.request.post('/api/games/join', {
    data: { code, nickname: 'Alice' },
  })
  const { player_id: p1Id } = await join1.json()

  const join2 = await page.request.post('/api/games/join', {
    data: { code, nickname: 'Bob' },
  })
  const { player_id: p2Id } = await join2.json()

  // Start game
  await page.request.post(`/api/games/${game_id}/start`, {
    data: { creator_player_id: p1Id },
  })

  // Find whose turn it is and submit
  const pollRes = await page.request.get(`/api/games/${game_id}`)
  const pollData = await pollRes.json()
  const currentPlayerId = pollData.current_player_id

  await page.request.post('/api/turns', {
    data: { game_id, player_id: currentPlayerId, sentence: 'The end of the print test.' },
  })

  // Visit the public story page
  await page.goto(`/story/${game_id}`)
  await expect(page.getByText('Print test story')).toBeVisible()

  // Click Download PDF
  await page.getByRole('button', { name: 'Download PDF' }).click()

  expect(printCalled).toBe(true)
})
