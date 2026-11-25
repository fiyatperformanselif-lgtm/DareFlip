import { chooseGenders } from '../helpers/players';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Automated violations and incomplete manual-review results are separate evidence. */
test('WCAG automated scan of home, setup, game, settings and dialogs', async ({ page }, testInfo) => {
  const evidence: object[] = [];
  const scan = async (name: string) => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    evidence.push({
      screen: name,
      violations: result.violations,
      incomplete: result.incomplete,
      passes: result.passes.map(({ id }) => id),
    });
    await testInfo.attach(`${name}-axe`, { body: JSON.stringify(evidence.at(-1), null, 2), contentType: 'application/json' });
    expect.soft(result.violations, `${name}: definite automated violations`).toEqual([]);
  };
  await page.goto('/');
  await expect(page.locator('.splash')).toHaveCount(0);
  await scan('home');
  await page.locator('.daily-tile').click();
  await scan('daily-dialog');
  await page.keyboard.press('Escape');
  await page.locator('.hero-play').click();
  await scan('setup');
  await page.getByRole('textbox', { name: 'Player name 1' }).fill('Alex');
  await page.getByRole('textbox', { name: 'Player name 2' }).fill('Deniz');
  await chooseGenders(page);
  await page.getByRole('button', { name: 'Start the game' }).click();
  await scan('game-choice');
  await page.getByRole('button', { name: 'Truth', exact: true }).click();
  await scan('game-card');
  await page.getByRole('button', { name: 'Take a break', exact: true }).click();
  await scan('pause-dialog');
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await scan('settings');
  await page.getByRole('button', { name: 'Privacy Policy', exact: true }).click();
  await scan('privacy-dialog');
  await testInfo.attach('all-screens-axe', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
