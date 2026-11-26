import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Card } from "../../src/domain/types";
import type { State } from "../../src/state";

const catalog: Card[] = JSON.parse(
  readFileSync(
    new URL("../../src/content/cards.json", import.meta.url),
    "utf8",
  ),
);

function longestCard(language: "en" | "tr") {
  return catalog
    .filter(
      (card) =>
        card.language === language &&
        card.category !== "flirty" &&
        card.pack === "core",
    )
    .sort((a, b) => b.text.length - a.text.length)[0];
}

async function resumeCard(
  page: Page,
  card: Card,
  locale: "en" | "tr" | "ar" = card.language as "en" | "tr",
  playerCount = 2,
) {
  const players = Array.from(
    { length: playerCount },
    (_, index) => `Player ${index + 1}`,
  );
  const fixture: State = {
    version: 1,
    locale,
    sound: false,
    haptics: false,
    favorites: [],
    unlocked: false,
    ageConfirmed: false,
    session: {
      players,
      genders: players.map(() => "undisclosed"),
      mode: card.category,
      difficulty: card.difficulty,
      seen: [card.id],
      player: players[0],
      card,
      rounds: 1,
    },
  };
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dareflip:v1"))
      localStorage.setItem("dareflip:v1", JSON.stringify({ version: 1, data }));
  }, fixture);
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page.locator(".resume-banner").click();
  await expect(page.getByTestId("card-prompt")).toHaveText(card.text);
}

async function controlInViewport(control: Locator, bottomReservation = 0) {
  await expect(control).toBeVisible();
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      receivesPointer: element.contains(
        document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        ),
      ),
    };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(
    geometry.viewportHeight - bottomReservation + 1,
  );
  expect(geometry.receivesPointer).toBe(true);
}

async function gameControlsInViewport(page: Page) {
  const buttons = page.locator(".game-actions button, .card-actions button");
  await expect(buttons).toHaveCount(4);
  for (const button of await buttons.all()) await controlInViewport(button);
}

async function readableBody(page: Page) {
  const body = page.locator(".card-body");
  await expect(body).toBeVisible();
  const metrics = await body.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    let visibleTop = Math.max(rect.top, 0);
    let visibleBottom = Math.min(rect.bottom, innerHeight);
    for (
      let parent = element.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) {
        const bounds = parent.getBoundingClientRect();
        visibleTop = Math.max(visibleTop, bounds.top);
        visibleBottom = Math.min(visibleBottom, bounds.bottom);
      }
    }
    return {
      visibleHeight: Math.max(0, visibleBottom - visibleTop),
      height: element.clientHeight,
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      fontSize: parseFloat(
        getComputedStyle(element.querySelector(".card-prompt")!).fontSize,
      ),
      bodyBottom: rect.bottom,
      footerTop: document.querySelector(".card-footer")!.getBoundingClientRect()
        .top,
      footerBottom: document
        .querySelector(".card-footer")!
        .getBoundingClientRect().bottom,
      actionsTop: document
        .querySelector(".game-actions")!
        .getBoundingClientRect().top,
    };
  });
  expect(metrics.height).toBeGreaterThanOrEqual(40);
  expect(metrics.visibleHeight).toBeGreaterThanOrEqual(39.5);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.fontSize).toBeGreaterThanOrEqual(16);
  expect(metrics.bodyBottom).toBeLessThanOrEqual(metrics.footerTop + 1);
  expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.actionsTop + 1);
  return { body, metrics };
}

test("360px phone keeps a save toast clear of Next and preserves 44px actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await resumeCard(page, longestCard("en"));
  await gameControlsInViewport(page);
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  const toast = page.locator(".toast");
  await expect(toast).toBeVisible();
  const next = page.locator(".next-button");
  const [toastRect, nextRect] = await Promise.all([
    toast.boundingBox(),
    next.boundingBox(),
  ]);
  expect(toastRect).not.toBeNull();
  expect(nextRect).not.toBeNull();
  const overlapWidth = Math.max(
    0,
    Math.min(toastRect!.x + toastRect!.width, nextRect!.x + nextRect!.width) -
      Math.max(toastRect!.x, nextRect!.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(toastRect!.y + toastRect!.height, nextRect!.y + nextRect!.height) -
      Math.max(toastRect!.y, nextRect!.y),
  );
  expect(overlapWidth * overlapHeight).toBe(0);
  await controlInViewport(next);
  // The notification must leave the next action operable, not just visible.
  await next.click();
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "choosing",
  );
});

test("1024x768 Turkish card keeps its actions fully within the tablet viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await resumeCard(page, longestCard("tr"));
  await expect(page.getByTestId("card-prompt")).toHaveAttribute("lang", "tr");
  await readableBody(page);
  await gameControlsInViewport(page);
});

test("568x320 long English card retains a readable scroll area and 44px actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await resumeCard(page, longestCard("en"));
  const { body, metrics } = await readableBody(page);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.height + 5);
  await gameControlsInViewport(page);
  await expect(page.locator(".card-scroll-hint")).toBeVisible();
  await expect(body).toHaveAttribute("tabindex", "0");
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator(".card-scroll-hint")).toHaveCount(0);
  const remaining = await body.evaluate(
    (element) =>
      element.scrollHeight - element.clientHeight - element.scrollTop,
  );
  expect(remaining).toBeLessThanOrEqual(5);
});

test("Arabic fallback with 20 players and a 60px banner reservation remains readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 568, height: 320 });
  const card = longestCard("en");
  await resumeCard(page, card, "ar", 20);
  // Simulate native banner geometry only; this test never requests an ad or SDK.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--ad-height", "60px");
  });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("card-prompt")).toHaveAttribute("lang", "en");
  await expect(page.locator(".fallback")).toBeVisible();
  const { body } = await readableBody(page);
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator(".card-scroll-hint")).toHaveCount(0);
  // Under this stress case scrolling may be necessary, but every action remains
  // independently reachable with a full touch target.
  const buttons = page.locator(".game-actions button, .card-actions button");
  await expect(buttons).toHaveCount(4);
  for (const button of await buttons.all()) {
    await button.scrollIntoViewIfNeeded();
    await controlInViewport(button, 60);
  }
});
