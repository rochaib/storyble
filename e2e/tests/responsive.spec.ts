import { test, expect } from '@playwright/test'

test('create page renders correctly on mobile', async ({ page }) => {
  await page.goto('/create')

  await expect(page.getByPlaceholder('e.g. Alex')).toBeVisible()
  await expect(page.getByPlaceholder('It was a perfectly ordinary Tuesday')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Game' })).toBeVisible()
  await expect(page.getByRole('button', { name: '5m' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'None' })).toBeVisible()

  const body = page.locator('body')
  const box = await body.boundingBox()
  const viewport = page.viewportSize()
  if (box && viewport) {
    expect(box.width).toBeLessThanOrEqual(viewport.width)
  }
})

test('home page renders correctly on mobile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Join' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
})
