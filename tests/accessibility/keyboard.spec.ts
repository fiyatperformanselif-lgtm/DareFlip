import { chooseGenders } from "../helpers/players";
import { expect, test, type Page } from "@playwright/test";

async function home(page: Page) {
  await page.goto("/");
  await expect(page.locator(".splash")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
}

async function startGame(page: Page) {
  await page.locator(".hero-play").click();
  await page.getByRole("textbox", { name: "Player name 1" }).fill("Alex");
  await page.getByRole("textbox", { name: "Player name 2" }).fill("Deniz");
  await chooseGenders(page);
  await page.getByRole("button", { name: "Start the game" }).click();
}

async function checkControls(page: Page) {
  const controls = page.locator(
    "button:visible,input:visible,select:visible,a[href]:visible",
  );
  for (let index = 0; index < (await controls.count()); index += 1) {
    const control = controls.nth(index);
    await expect(control).toHaveAccessibleName(/\S/);
    if (await control.isDisabled()) continue;
    const rect = await control.boundingBox();
    expect(rect, "Visible control has a bounding rectangle").not.toBeNull();
    expect(
      rect!.width,
      await control.evaluate((element) => element.outerHTML),
    ).toBeGreaterThanOrEqual(44);
    expect(
      rect!.height,
      await control.evaluate((element) => element.outerHTML),
    ).toBeGreaterThanOrEqual(44);
  }
}

test("visible controls have accessible names and at least 44px targets across the game flow", async ({
  page,
}) => {
  await home(page);
  await checkControls(page);
  await page.locator(".hero-play").click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await checkControls(page);
  await page.getByRole("textbox", { name: "Player name 1" }).fill("Alex");
  await page.getByRole("textbox", { name: "Player name 2" }).fill("Deniz");
  await chooseGenders(page);
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await checkControls(page);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).toBeVisible();
  await expect(page.getByTestId("card-prompt")).toBeFocused();
  await checkControls(page);
});

test("daily modal traps focus, makes background inert and restores its trigger on Escape", async ({
  page,
}) => {
  await home(page);
  const trigger = page.locator(".daily-tile");
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  const last = dialog.getByRole("button", { name: "Share card", exact: true });
  await expect(close).toBeFocused();
  await expect(page.locator(".main")).toHaveAttribute("inert", "");
  await expect(page.locator(".bottom-nav")).toHaveAttribute("inert", "");
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator(".main")).not.toHaveAttribute("inert");
});

test("pause and legal dialogs remain keyboard dismissible and focus stays inside", async ({
  page,
}) => {
  await home(page);
  await startGame(page);
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "End game", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Take a break", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page.getByRole("button", { name: "End game", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await checkControls(page);
  const trigger = page.getByRole("button", {
    name: "Privacy Policy",
    exact: true,
  });
  await trigger.click();
  dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  const links = dialog.getByRole("link");
  const focusable = dialog.locator(
    "button:visible:not([disabled]),a[href]:visible",
  );
  const lastFocusable = focusable.last();
  // Legal pages can contain Google policy and publisher links. They are part of
  // the same focus loop instead of trapping Tab on the close button alone.
  await page.keyboard.press("Tab");
  await expect((await links.count()) ? links.first() : close).toBeFocused();
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(lastFocusable).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

for (const width of [320, 768, 1024]) {
  test(`navigation and setup stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await home(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(page.locator(".hero-play")).toBeVisible();
    await checkControls(page);
    await page.locator(".hero-play").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await checkControls(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await checkControls(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}
