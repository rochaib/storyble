import { test, expect } from '@playwright/test'

test('admin login redirects to login page', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForURL(/\/admin\/login/)
  await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
})
