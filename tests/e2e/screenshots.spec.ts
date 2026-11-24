import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('capture authentic device-size release reference screens', async ({ page }, testInfo) => {
  const directory = path.join('artifacts', 'screenshots', testInfo.project.name);
  await mkdir(directory, { recursive: true });
  const capture = async (name: string) => {
    const file = path.join(directory, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
    await testInfo.attach(`${testInfo.project.name}-${name}`, { path: file, contentType: 'image/png' });
  };
  await page.goto('/');
  await page.locator('.splash').waitFor({ state: 'hidden' });
  await expect(page.getByRole('heading', { name: 'Make tonight unforgettable.' })).toBeVisible();
  await capture('01-discover');
  await page.getByRole('button', { name: /Party / }).click();
  await page.getByRole('textbox', { name: 'Player name 1', exact: true }).fill('Alex');
  await page.getByRole('textbox', { name: 'Player name 2', exact: true }).fill('Sam');
  await capture('02-players');
  await page.getByRole('button', { name: 'Start the game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Spin the bottle', exact: true })).toBeVisible();
  await capture('03-spin');
  await page.getByRole('button', { name: 'Truth', exact: true }).click();
  await expect(page.getByTestId('card-prompt')).toBeVisible();
  await capture('04-truth');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await page.getByRole('button', { name: 'Take a break', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue your game', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(page.locator('.saved-card')).toHaveCount(1);
  await capture('05-saved');
});
