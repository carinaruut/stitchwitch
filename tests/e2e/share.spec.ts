import { expect, test } from '@playwright/test'

test('a shared project edits in isolation and restores its tab draft', async ({ context, page }) => {
  await page.goto('/#/')
  const directShare = page.getByRole('button', { name: 'Share', exact: true })
  if (await directShare.isVisible()) await directShare.click()
  else {
    await page.getByRole('button', { name: 'More project actions' }).click()
    await page.getByRole('button', { name: 'Share project' }).click()
  }
  const shareLink = page.getByRole('textbox', { name: 'Share link' })
  await expect(shareLink).toBeVisible()
  const url = await shareLink.inputValue()
  const before = await page.evaluate(() => Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key.startsWith('stitch-project')),
  ))

  const sharedPage = await context.newPage()
  await sharedPage.goto(url)
  await expect(sharedPage.getByRole('dialog', { name: 'Open shared project?' })).toBeVisible()
  await sharedPage.getByRole('button', { name: 'Edit temporary copy' }).click()
  await expect(sharedPage.getByText('You are editing a shared copy')).toBeVisible()
  expect(await sharedPage.evaluate(() => Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key.startsWith('stitch-project')),
  ))).toEqual(before)

  const newTabPromise = context.waitForEvent('page')
  await sharedPage.getByRole('button', { name: 'Edit copy in new tab' }).click()
  const newTab = await newTabPromise
  await newTab.getByRole('button', { name: 'Edit temporary copy' }).click()
  await expect(newTab.getByText('You are editing a shared copy')).toBeVisible()
  await newTab.close()

  const name = sharedPage.getByRole('textbox', { name: 'Project name' })
  await name.fill('Shared browser revision')
  await name.blur()
  await expect.poll(() => sharedPage.evaluate(() => (
    Object.values(sessionStorage).some(value => value.includes('Shared browser revision'))
  ))).toBe(true)
  expect(await sharedPage.evaluate(() => (
    Object.values(localStorage).some(value => value.includes('Shared browser revision'))
  ))).toBe(false)

  await sharedPage.reload()
  await expect(sharedPage.getByRole('textbox', { name: 'Project name' })).toHaveValue('Shared browser revision')

  const originalAutosaves = Object.fromEntries(Object.entries(before).filter(([key]) => key.startsWith('stitch-project-autosave:')))
  await sharedPage.getByRole('button', { name: 'Add copy to Editor' }).click()
  await expect(sharedPage.getByRole('tab', { name: 'Shared browser revision' })).toBeVisible()
  expect(await sharedPage.evaluate(() => Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key.startsWith('stitch-project-autosave:')),
  ))).toMatchObject(originalAutosaves)
})

test('invalid and unsupported links show localized errors without rendering a project', async ({ page }) => {
  await page.goto('/#/share?data=sw9.gzip.1.AA')
  await expect(page.getByRole('heading', { name: 'This share link cannot be opened' })).toBeVisible()
  await expect(page.getByText('This share-link version is not supported.')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveCount(0)
})
