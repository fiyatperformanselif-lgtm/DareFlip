import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { State } from "../../src/state";
import type { Card } from "../../src/domain/types";
import { chooseGenders } from "../helpers/players";

// Browser animation/state coverage. Native gestures, SDKs and device frame rate
// still require the new signed binary on a physical device.
test.use({ reducedMotion: "no-preference" });

const catalog: Card[] = JSON.parse(
  readFileSync(
    new URL("../../src/content/cards.json", import.meta.url),
    "utf8",
  ),
);
const archived: Card[] = JSON.parse(
  readFileSync(
    new URL("../../src/content/archive-v1.json", import.meta.url),
    "utf8",
  ),
);

async function saved(page: Page): Promise<State> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
}

async function open(page: Page) {
  await page.clock.install({ time: new Date("2026-11-26T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-26T12:00:10Z"));
  await page.goto("/");
  await page.clock.runFor(1000);
  await page.locator(".splash").waitFor({ state: "hidden" });
}

async function startParty(page: Page, names = ["Alex", "Sam"]) {
  await page.locator("button.mode-party").click();
  for (const [index, name] of names.entries()) {
    await page
      .getByRole("textbox", { name: `Player name ${index + 1}`, exact: true })
      .fill(name);
  }
  await chooseGenders(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "choosing",
  );
}

async function revealSavedCard(page: Page) {
  await startParty(page);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).toBeVisible();
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  const before = await saved(page);
  expect(before.session?.card).toBeTruthy();
  return before;
}

async function spin(page: Page) {
  await page.getByRole("button", { name: "Next turn", exact: true }).click();
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "spinning",
  );
}

async function pause(page: Page) {
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("a visible bottle keeps the saved card until one settled turn despite rapid taps", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  const bottle = page.locator(".bottle");
  const pose = await bottle.getAttribute("style");
  // Repeated user activations in one task cannot queue multiple selections.
  await page.locator(".next-button").evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
    button.click();
  });
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "spinning",
  );
  await expect(
    page.getByRole("button", { name: "Spin the bottle", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Spin the bottle", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
  await page.clock.runFor(400);
  expect(await bottle.getAttribute("style")).not.toEqual(pose);
  expect(await saved(page)).toEqual(before);
  await page.clock.runFor(1000);
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "choosing",
  );
  const after = await saved(page);
  const winner = before.session!.players.find(
    (name) => name !== before.session!.player,
  );
  expect(after).toEqual({
    ...before,
    session: { ...before.session, player: winner, card: null },
  });
  await page.clock.runFor(3000);
  expect(await saved(page)).toEqual(after);
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeEnabled();
});

test("pausing a spin restores the same card and a later spin still works", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  await spin(page);
  await page.clock.runFor(100);
  await pause(page);
  await page.clock.runFor(3000);
  expect(await saved(page)).toEqual(before);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep playing", exact: true })
    .click();
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "revealed",
  );
  await expect(page.getByTestId("card-prompt")).toHaveText(
    before.session!.card!.text,
  );
  await spin(page);
  await page.clock.runFor(1400);
  expect((await saved(page)).session?.player).not.toEqual(
    before.session!.player,
  );
});

test("leaving a pending turn preserves resume and cannot change a replacement game", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  await spin(page);
  await pause(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(page.locator(".game-screen")).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(page.getByTestId("card-prompt")).toHaveText(
    before.session!.card!.text,
  );
  await spin(page);
  await pause(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await startParty(page, ["Taylor", "Robin"]);
  const replacement = await saved(page);
  expect(replacement.session?.players).toEqual(["Taylor", "Robin"]);
  await page.clock.runFor(4000);
  expect(await saved(page)).toEqual(replacement);
  expect(replacement.favorites).toEqual(before.favorites);
});

test("ending during a pending turn keeps favorites and cannot resurrect the session", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  await spin(page);
  await pause(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End game", exact: true })
    .click();
  await page.clock.runFor(4000);
  const after = await saved(page);
  expect(after).toEqual({ ...before, session: null });
  await expect(
    page.getByRole("button", { name: /^Continue your game/ }),
  ).toHaveCount(0);
});

test("reloading midway through a spin resumes the previously revealed card", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  await spin(page);
  await page.clock.runFor(250);
  await page.reload();
  await page.clock.runFor(1000);
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(page.getByTestId("card-prompt")).toHaveText(
    before.session!.card!.text,
  );
  await page.clock.runFor(3000);
  expect(await saved(page)).toEqual(before);
});

test("document inactivity cancels a pending turn without changing the save", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  await spin(page);
  await page.clock.runFor(100);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(3000);
  expect(await saved(page)).toEqual(before);
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "revealed",
  );
  await expect(page.getByTestId("card-prompt")).toHaveText(
    before.session!.card!.text,
  );
});

test("reduced motion settles within 250ms and preserves card history", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await revealSavedCard(page);
  await spin(page);
  expect(await saved(page)).toEqual(before);
  await page.clock.runFor(200);
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "choosing",
  );
  const after = await saved(page);
  expect(after.session?.player).not.toEqual(before.session!.player);
  expect(after.session?.card).toBeNull();
  expect(after.session?.seen).toEqual(before.session!.seen);
  expect(after.session?.rounds).toEqual(before.session!.rounds);
  expect(after.favorites).toEqual(before.favorites);
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeEnabled();
});

test("changing difficulty from pause keeps seen cards and favorites when returning", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  await pause(page);
  await page
    .getByRole("dialog")
    .getByRole("group", { name: "Choose another difficulty", exact: true })
    .getByRole("button", { name: "Medium", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "choosing",
  );
  expect(await saved(page)).toEqual({
    ...before,
    session: { ...before.session, difficulty: "medium", card: null },
  });
  await pause(page);
  await page
    .getByRole("dialog")
    .getByRole("group", { name: "Choose another difficulty", exact: true })
    .getByRole("button", { name: "Easy", exact: true })
    .click();
  expect(await saved(page)).toEqual({
    ...before,
    session: { ...before.session, card: null },
  });
  const poolSize = catalog.filter(
    (card) =>
      card.language === "en" &&
      card.category === "party" &&
      card.difficulty === "easy" &&
      card.type === "truth" &&
      card.pack === "core",
  ).length;
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toHaveAccessibleDescription(`Truth cards left: ${poolSize - 1}`);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  expect((await saved(page)).session?.card?.id).not.toEqual(
    before.session!.card!.id,
  );
});

test("exhaustion offers a new difficulty and a fresh deck resets only its current pool", async ({
  page,
}) => {
  const before = await revealSavedCard(page);
  const easyTruths = catalog.filter(
    (card) =>
      card.language === "en" &&
      card.category === "party" &&
      card.difficulty === "easy" &&
      card.type === "truth" &&
      card.pack === "core",
  );
  const easyDare = catalog.find(
    (card) =>
      card.language === "en" &&
      card.category === "party" &&
      card.difficulty === "easy" &&
      card.type === "dare" &&
      card.pack === "core",
  )!;
  const preserved = [
    catalog.find(
      (card) =>
        card.language === "en" &&
        card.category === "party" &&
        card.difficulty === "medium" &&
        card.pack === "core",
    )!.id,
    catalog.find(
      (card) => card.language === "en" && card.category === "couples",
    )!.id,
    archived.find(
      (card) => card.language === "en" && card.category === "party",
    )!.id,
  ];
  const seen = [
    ...easyTruths.map((card) => card.id),
    easyDare.id,
    ...preserved,
  ];
  const checkpoint = {
    ...before,
    session: { ...before.session!, card: null, seen, rounds: seen.length },
  };
  // A completed deck fixture exercises UI recovery without replaying every card.
  await page.evaluate((data) => {
    localStorage.setItem("dareflip:v1", JSON.stringify({ version: 1, data }));
  }, checkpoint);
  await page.reload();
  await page.clock.runFor(1000);
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toHaveAccessibleDescription("Truth cards left: 0");
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.locator(".game-screen")).toHaveAttribute(
    "data-phase",
    "exhausted",
  );
  expect(await saved(page)).toEqual(checkpoint);
  await page
    .locator(".exhausted")
    .getByRole("group", { name: "Choose another difficulty", exact: true })
    .getByRole("button", { name: "Medium", exact: true })
    .click();
  expect(await saved(page)).toEqual({
    ...checkpoint,
    session: { ...checkpoint.session, difficulty: "medium" },
  });
  await pause(page);
  await page
    .getByRole("dialog")
    .getByRole("group", { name: "Choose another difficulty", exact: true })
    .getByRole("button", { name: "Easy", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await page
    .locator(".exhausted")
    .getByRole("button", { name: "Start a fresh deck", exact: true })
    .click();
  expect(await saved(page)).toEqual({
    ...checkpoint,
    session: { ...checkpoint.session, seen: preserved },
  });
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toHaveAccessibleDescription(`Truth cards left: ${easyTruths.length}`);
  expect((await saved(page)).favorites).toEqual(before.favorites);
});
