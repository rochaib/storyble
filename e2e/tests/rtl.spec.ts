import { test, expect } from '@playwright/test'

test('Hebrew text gets RTL direction on create page', async ({ page }) => {
  await page.goto('/create')
  const textarea = page.getByPlaceholder('It was a perfectly ordinary Tuesday')
  await textarea.fill('היה היום יפה מאוד')
  await expect(textarea).toHaveAttribute('dir', 'auto')
})
