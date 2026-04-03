import { type Page } from '@playwright/test'

export async function createGameViaUI(page: Page, opts: {
  nickname: string
  openingLine: string
  rounds?: number
}) {
  await page.goto('/create')
  await page.getByPlaceholder('e.g. Alex').fill(opts.nickname)
  await page.getByPlaceholder('It was a perfectly ordinary Tuesday').fill(opts.openingLine)
  if (opts.rounds) {
    await page.locator('input[type="number"]').fill(String(opts.rounds))
  }
  await page.getByRole('button', { name: 'Create Game' }).click()
  await page.waitForURL(/\/game\/.*\/lobby/)
}

export async function getGameCodeFromLobby(page: Page): Promise<string> {
  const codeEl = page.locator('p.text-4xl')
  await codeEl.waitFor()
  return (await codeEl.textContent()) ?? ''
}

export async function joinGameViaUI(page: Page, opts: {
  code: string
  nickname: string
}) {
  await page.goto(`/?code=${opts.code}`)
  await page.getByPlaceholder('Your nickname').fill(opts.nickname)
  await page.getByRole('button', { name: 'Join' }).click()
  await page.waitForURL(/\/game\/.*\/lobby/)
}
