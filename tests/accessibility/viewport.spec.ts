import { expect, test, type Locator, type Page } from "@playwright/test";

// These checks cover prerequisites for avoiding iOS focus zoom and regressions in
// the responsive layout. Desktop Chromium/WebKit do not reproduce an iPhone's
// software-keyboard autozoom or WKWebView pinch behavior; real-device checks remain necessary.
test.use({ isMobile: true, hasTouch: true });

const editableControls =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),select,textarea';

async function expectReadableControlText(page: Page) {
  const controls = page.locator(editableControls).filter({ visible: true });
  expect(
    await controls.count(),
    "This state must exercise at least one editable control",
  ).toBeGreaterThan(0);
  for (const control of await controls.all()) {
    const font = await control.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(
      font,
      `${await control.evaluate((element) => element.outerHTML)} uses readable text without the small-font iOS focus-zoom trigger`,
    ).toBeGreaterThanOrEqual(16);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    containers: [".app", ".main"].map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing layout container: ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        selector,
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: rect.left,
        right: rect.right,
      };
    }),
  }));
  expect(
    dimensions.documentWidth,
    "The document must fit its layout viewport",
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  for (const container of dimensions.containers) {
    expect(
      container.scrollWidth,
      `${container.selector} must not hide horizontal content overflow`,
    ).toBeLessThanOrEqual(container.width + 1);
    expect(
      container.left,
      `${container.selector} must remain inside the viewport`,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      container.right,
      `${container.selector} must remain inside the viewport`,
    ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  }
}

async function expectReachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  await expect(control).toBeInViewport();
  await expect(control).toBeEnabled();
}

async function expectScalableViewport(page: Page) {
  const value = await page
    .locator('meta[name="viewport"]')
    .getAttribute("content");
  expect(value).not.toBeNull();
  const options = new Map(
    value!.split(",").map((entry) => {
      const [key, content = ""] = entry
        .trim()
        .toLowerCase()
        .split(/\s*=\s*/);
      return [key, content];
    }),
  );
  expect(options.get("width")).toBe("device-width");
  expect(Number(options.get("initial-scale"))).toBe(1);
  expect(["no", "0"]).not.toContain(options.get("user-scalable"));
  if (options.has("maximum-scale"))
    expect(Number(options.get("maximum-scale"))).toBeGreaterThan(1);
  if (options.has("minimum-scale"))
    expect(Number(options.get("minimum-scale"))).toBeLessThanOrEqual(1);
}

for (const viewport of [
  { width: 320, height: 740, label: "narrow phone" },
  { width: 390, height: 844, label: "phone portrait" },
  { width: 844, height: 390, label: "phone landscape" },
  { width: 768, height: 1024, label: "tablet" },
]) {
  test(`${viewport.label}: editable text avoids focus-zoom triggers and the game stays reachable`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");
    await expect(page.locator(".splash")).toHaveCount(0);
    await expectScalableViewport(page);
    await expectNoHorizontalOverflow(page);

    await page.locator(".hero-play").click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expectReadableControlText(page);
    const first = page.getByRole("textbox", {
      name: "Player name 1",
      exact: true,
    });
    const second = page.getByRole("textbox", {
      name: "Player name 2",
      exact: true,
    });
    await first.focus();
    await first.fill("Alexandra Longplayer");
    await expectNoHorizontalOverflow(page);
    await first.blur();
    await second.focus();
    await second.fill("Deniz");
    await second.blur();
    await expectReadableControlText(page);
    await expectNoHorizontalOverflow(page);
    const start = page.getByRole("button", {
      name: "Start the game",
      exact: true,
    });
    await expectReachable(start);
    await start.click();

    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expectNoHorizontalOverflow(page);
    const truth = page.getByRole("button", { name: "Truth", exact: true });
    await expectReachable(truth);
    await truth.click();
    await expect(page.getByTestId("card-prompt")).toBeFocused();
    await expectNoHorizontalOverflow(page);
    const skip = page.getByRole("button", { name: "Skip freely", exact: true });
    await expectReachable(
      page.getByRole("button", { name: "Next turn", exact: true }),
    );
    await expectReachable(skip);
    await skip.click();
    await expect(
      page.getByRole("button", { name: "Truth", exact: true }),
    ).toBeEnabled();
    await expectNoHorizontalOverflow(page);

    await page
      .getByRole("button", { name: "Take a break", exact: true })
      .click();
    await page.getByRole("button", { name: "End game", exact: true }).click();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expectReadableControlText(page);
    const language = page.locator(".language-row select");
    await expect(language).toHaveAccessibleName("Language");
    await expectReachable(language);
    await language.focus();
    await language.selectOption("tr");
    await language.blur();
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expectReadableControlText(page);
    await expectNoHorizontalOverflow(page);

    // The session is intentionally ended, so returning to Play cannot rely on a
    // persisted card or previous screen position to make the setup usable again.
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Oyna", exact: true })
      .click();
    await expectReachable(page.locator(".hero-play"));
    await page.locator(".hero-play").click();
    await expectReadableControlText(page);
    await expectReachable(
      page.getByRole("button", { name: "Oyunu başlat", exact: true }),
    );
    await expectNoHorizontalOverflow(page);
  });
}
