import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { t } from "../../src/i18n";
import type { Card, Difficulty, Kind } from "../../src/domain/types";
import type { State } from "../../src/state";
import { chooseGenders, confirmPartners } from "../helpers/players";

type Language = "en" | "tr";
const catalog: Card[] = JSON.parse(
  readFileSync(
    new URL("../../src/content/cards.json", import.meta.url),
    "utf8",
  ),
);

async function saved(page: Page): Promise<State> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
}

async function openFlirty(
  page: Page,
  language: Language,
  difficulty: Difficulty,
) {
  // Advance a normal user pause with the browser clock rather than spending real
  // seconds on every bottle animation. Native animation/keyboard behavior is not tested.
  await page.clock.install();
  await page.goto("/");
  await page.clock.fastForward(2000);
  await page.locator(".splash").waitFor({ state: "hidden" });
  if (language === "tr") {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Language", exact: true })
      .selectOption("tr");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: t(language, "nav.play"), exact: true })
      .click();
  }
  await page.locator("button.mode-flirty").click();
  for (const [index, name] of ["Alex", "Deniz"].entries()) {
    await page
      .getByRole("textbox", {
        name: `${t(language, "setup.playerName")} ${index + 1}`,
        exact: true,
      })
      .fill(name);
  }
  await chooseGenders(
    page,
    ["female", "undisclosed"],
    t(language, "setup.gender"),
  );
  await page
    .locator(".difficulty")
    .getByRole("button", {
      name: new RegExp(`${t(language, `setup.${difficulty}`)}$`),
    })
    .click();
  const start = page.getByRole("button", {
    name: t(language, "setup.start"),
    exact: true,
  });
  const confirmations = page.getByRole("checkbox");
  await expect(confirmations).toHaveCount(2);
  await expect(confirmations.nth(0)).toHaveAccessibleName(/Alex/);
  await expect(confirmations.nth(1)).toHaveAccessibleName(/Deniz/);
  for (const checkbox of await confirmations.all())
    await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: t(language, "setup.add"), exact: true }),
  ).toHaveCount(0);
  await start.click();
  await expect(page.getByRole("alert")).toHaveText(
    t(language, "setup.partnerConsentRequired"),
  );
  await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  await confirmations.nth(0).check();
  await start.click();
  await expect(page.getByRole("alert")).toHaveText(
    t(language, "setup.partnerConsentRequired"),
  );
  await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  await confirmPartners(page);
  await start.click();
  await expect(
    page.getByRole("button", { name: t(language, "game.truth"), exact: true }),
  ).toBeEnabled();
}

async function currentCard(
  page: Page,
  language: Language,
  difficulty: Difficulty,
  type: Kind,
): Promise<Card> {
  const card = (await saved(page)).session?.card;
  expect(card).toBeTruthy();
  if (!card) throw new Error("A revealed card must be persisted.");
  // The shipped catalog is an independent oracle; no production draw helper is used.
  expect(card).toEqual(
    catalog.find((item) => item.id === card.id && item.language === language),
  );
  expect(card).toMatchObject({
    category: "flirty",
    difficulty,
    type,
    language,
    sensitive: true,
    pack: "core",
  });
  await expect(page.getByTestId("card-prompt")).toHaveText(card.text);
  await expect(page.getByTestId("card-prompt")).toHaveAttribute(
    "lang",
    language,
  );
  await expect(page.locator(".fallback")).toHaveCount(0);
  return card;
}

async function nextChoice(page: Page, language: Language, skip = false) {
  await page
    .getByRole("button", {
      name: t(language, skip ? "game.skip" : "game.next"),
      exact: true,
    })
    .click();
  await page.clock.fastForward(2000);
  await expect(
    page.getByRole("button", { name: t(language, "game.truth"), exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: t(language, "game.dare"), exact: true }),
  ).toBeEnabled();
}

for (const language of ["en", "tr"] as const) {
  for (const difficulty of ["easy", "medium", "bold"] as const) {
    test(`Flirty 18+ ${language}/${difficulty}: both complete pools, free skips, explicit reset and saved adult session`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await openFlirty(page, language, difficulty);
      for (const type of ["truth", "dare"] as const) {
        const ids = catalog
          .filter(
            (card) =>
              card.category === "flirty" &&
              card.language === language &&
              card.difficulty === difficulty &&
              card.type === type &&
              card.pack === "core",
          )
          .map((card) => card.id);
        expect(ids).toHaveLength(6);
        const drawn = new Set<string>();
        for (let index = 0; index < 6; index++) {
          await page
            .getByRole("button", {
              name: t(language, `game.${type}`),
              exact: true,
            })
            .click();
          const card = await currentCard(page, language, difficulty, type);
          expect(drawn.has(card.id)).toBe(false);
          drawn.add(card.id);
          if (index === 0) {
            await page
              .getByRole("button", {
                name: t(language, "game.favorite"),
                exact: true,
              })
              .click();
            const beforeReload = await saved(page);
            expect(beforeReload.ageConfirmed).toBe(true);
            expect(beforeReload.session).toMatchObject({
              privateAcknowledged: true,
            });
            expect(beforeReload.favorites).toContain(card.id);
            await page.reload();
            await page.clock.fastForward(2000);
            await page.locator(".splash").waitFor({ state: "hidden" });
            await page.locator(".resume-banner").click();
            await expect(page.getByTestId("card-prompt")).toHaveText(card.text);
            const resumed = await saved(page);
            expect(resumed.session).toEqual(beforeReload.session);
            expect(resumed.favorites).toEqual(beforeReload.favorites);
            expect(resumed.ageConfirmed).toBe(true);
            expect(resumed.session).toMatchObject({
              privateAcknowledged: true,
            });
            await expect(page.getByRole("checkbox")).toHaveCount(0);
            await nextChoice(page, language, true);
            await expect(page.locator(".toast")).toHaveText(
              t(language, "game.skipNotice"),
            );
            const afterSkip = await saved(page);
            expect(afterSkip.session?.rounds).toBe(resumed.session?.rounds);
            expect(afterSkip.session?.seen).toEqual(resumed.session?.seen);
            expect(afterSkip.session?.players).toEqual(
              resumed.session?.players,
            );
            expect(afterSkip.session?.genders).toEqual(
              resumed.session?.genders,
            );
            expect(afterSkip.session?.player).not.toBe(resumed.session?.player);
            expect(afterSkip.session?.card).toBeNull();
            expect(afterSkip.favorites).toEqual(resumed.favorites);
            expect(afterSkip.ageConfirmed).toBe(true);
            expect(afterSkip.unlocked).toBe(resumed.unlocked);
          } else {
            await nextChoice(page, language);
          }
        }
        expect([...drawn].sort()).toEqual([...ids].sort());
        const beforeExhaustion = await saved(page);
        await page
          .getByRole("button", {
            name: t(language, `game.${type}`),
            exact: true,
          })
          .click();
        await expect(page.locator(".exhausted")).toContainText(
          t(language, "game.exhausted"),
        );
        await expect(page.getByTestId("card-prompt")).toHaveCount(0);
        expect((await saved(page)).session).toEqual(beforeExhaustion.session);
        await page
          .getByRole("button", {
            name: t(language, "game.restartDeck"),
            exact: true,
          })
          .click();
        expect((await saved(page)).session?.seen).toEqual([]);
        await page
          .getByRole("button", {
            name: t(language, `game.${type}`),
            exact: true,
          })
          .click();
        const renewed = await currentCard(page, language, difficulty, type);
        expect(drawn.has(renewed.id)).toBe(true);
        await nextChoice(page, language);
      }
    });
  }
}

test("320px Turkish Flirty Bold choices remain inside the viewport after a free skip", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openFlirty(page, "tr", "bold");
  await page
    .getByRole("button", { name: t("tr", "game.dare"), exact: true })
    .click();
  await currentCard(page, "tr", "bold", "dare");
  await nextChoice(page, "tr", true);
  const dimensions = await page.evaluate(() => {
    const selectors = [
      ".main",
      ".choice-buttons",
      ".truth-choice",
      ".dare-choice",
    ];
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      controls: selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const rect = element.getBoundingClientRect();
        return {
          selector,
          left: rect.left,
          right: rect.right,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      }),
    };
  });
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  for (const control of dimensions.controls) {
    expect(
      control.scrollWidth,
      `${control.selector}: no hidden horizontal content`,
    ).toBeLessThanOrEqual(control.width + 1);
    expect(
      control.left,
      `${control.selector}: left edge inside viewport`,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      control.right,
      `${control.selector}: right edge inside viewport`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
  for (const type of ["truth", "dare"] as const) {
    const choice = page.getByRole("button", {
      name: t("tr", `game.${type}`),
      exact: true,
    });
    await choice.scrollIntoViewIfNeeded();
    await expect(choice).toBeInViewport({ ratio: 1 });
    await expect(choice).toBeEnabled();
  }
});

const archivedFlirty: Card[] = JSON.parse(
  readFileSync(
    new URL("../../src/content/archive-v2-flirty.json", import.meta.url),
    "utf8",
  ),
);
const legacyCard = archivedFlirty.find(
  (card) =>
    card.language === "en" &&
    card.difficulty === "easy" &&
    card.type === "truth" &&
    card.pack === "core",
);
if (!legacyCard)
  throw new Error("The real v2 Flirty preservation fixture is missing.");

function legacyState(count: 2 | 3): State {
  return {
    version: 1,
    locale: "en",
    sound: false,
    haptics: false,
    favorites: [legacyCard!.id],
    unlocked: false,
    ageConfirmed: true,
    session: {
      players: ["Alex", "Deniz", "Sam"].slice(0, count),
      genders: (["female", "undisclosed", "male"] as const).slice(0, count),
      mode: "flirty",
      difficulty: "easy",
      seen: [legacyCard!.id],
      player: "Alex",
      card: legacyCard!,
      rounds: 1,
    },
  };
}

async function loadLegacy(page: Page, count: 2 | 3) {
  await page.clock.install();
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dareflip:v1"))
      localStorage.setItem("dareflip:v1", JSON.stringify({ version: 1, data }));
  }, legacyState(count));
  await page.goto("/");
  await page.clock.fastForward(2000);
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page.locator(".resume-banner").click();
}

test("each new private game needs two fresh named confirmations even after a previously acknowledged game", async ({
  page,
}) => {
  await openFlirty(page, "en", "easy");
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  const card = await currentCard(page, "en", "easy", "truth");
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  const previous = await saved(page);
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await page.locator("button.mode-flirty").click();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Add player", exact: true }),
  ).toHaveCount(0);
  const checks = page.getByRole("checkbox");
  await expect(checks).toHaveCount(2);
  await expect(checks.nth(0)).toHaveAccessibleName(/Alex/);
  await expect(checks.nth(1)).toHaveAccessibleName(/Deniz/);
  for (const checkbox of await checks.all())
    await expect(checkbox).not.toBeChecked();
  const start = page.getByRole("button", {
    name: "Start the game",
    exact: true,
  });
  await start.click();
  await expect(page.getByRole("alert")).toHaveText(
    t("en", "setup.partnerConsentRequired"),
  );
  await checks.nth(0).check();
  await start.click();
  await expect(page.getByRole("alert")).toHaveText(
    t("en", "setup.partnerConsentRequired"),
  );
  expect((await saved(page)).session).toEqual(previous.session);
  await confirmPartners(page);
  await start.click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeEnabled();
  const next = await saved(page);
  expect(next.session).toMatchObject({
    players: ["Alex", "Deniz"],
    seen: [],
    card: null,
    rounds: 0,
    privateAcknowledged: true,
  });
  expect(next.favorites).toContain(card.id);
});

test("a legacy two-person Flirty save adds personal acknowledgements without replacing its old card or favorites", async ({
  page,
}) => {
  await loadLegacy(page, 2);
  await expect(
    page.getByRole("textbox", { name: "Player name 1", exact: true }),
  ).toHaveValue("Alex");
  await expect(
    page.getByRole("textbox", { name: "Player name 2", exact: true }),
  ).toHaveValue("Deniz");
  for (const field of await page.getByRole("textbox").all())
    await expect(field).toHaveJSProperty("readOnly", true);
  const checks = page.getByRole("checkbox");
  await expect(checks).toHaveCount(2);
  for (const checkbox of await checks.all())
    await expect(checkbox).not.toBeChecked();
  const preserved = await saved(page);
  expect(preserved.session?.card).toEqual(legacyCard);
  expect(preserved.favorites).toEqual([legacyCard!.id]);
  const resume = page.getByRole("button", {
    name: "Keep playing",
    exact: true,
  });
  await checks.nth(0).check();
  await resume.click();
  await expect(page.getByRole("alert")).toHaveText(
    t("en", "setup.partnerConsentRequired"),
  );
  await confirmPartners(page);
  await resume.click();
  await expect(page.getByTestId("card-prompt")).toHaveText(legacyCard!.text);
  const acknowledged = await saved(page);
  expect(acknowledged.session).toEqual({
    ...preserved.session,
    privateAcknowledged: true,
  });
  expect(acknowledged.favorites).toEqual(preserved.favorites);
  await nextChoice(page, "en", true);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  const fresh = await currentCard(page, "en", "easy", "truth");
  expect(fresh.id).toContain("flirty-v3-");
  expect((await saved(page)).favorites).toEqual([legacyCard!.id]);
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Saved", exact: true })
    .click();
  await expect(page.locator(".saved-card")).toHaveCount(1);
  await expect(page.locator(".saved-card")).toContainText(legacyCard!.text);
});

test("a legacy group keeps its old card but cannot draw private cards or silently pick two partners", async ({
  page,
}) => {
  await loadLegacy(page, 3);
  await expect(page.getByTestId("card-prompt")).toHaveText(legacyCard!.text);
  await expect(page.locator(".private-notice")).toContainText(
    t("en", "setup.legacyPrivateGroup"),
  );
  expect((await saved(page)).favorites).toEqual([legacyCard!.id]);
  await page.getByRole("button", { name: "Skip freely", exact: true }).click();
  await page.clock.fastForward(2000);
  await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  for (const selector of [".truth-choice", ".dare-choice", ".bottle-stage"])
    await expect(page.locator(selector)).toBeDisabled();
  const held = await saved(page);
  expect(held.session?.players).toEqual(["Alex", "Deniz", "Sam"]);
  expect(held.session?.seen).toEqual([legacyCard!.id]);
  expect(held.session?.rounds).toBe(1);
  expect(held.favorites).toEqual([legacyCard!.id]);
  await page
    .getByRole("button", { name: t("en", "setup.newPrivateGame"), exact: true })
    .click();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  for (const field of await page.getByRole("textbox").all())
    await expect(field).toHaveValue("");
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  expect((await saved(page)).session).toEqual(held.session);
  expect((await saved(page)).favorites).toEqual(held.favorites);
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Lee");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill("Morgan");
  await chooseGenders(page, ["nonbinary", "undisclosed"]);
  await confirmPartners(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await currentCard(page, "en", "easy", "truth");
  const paired = await saved(page);
  expect(paired.session?.players).toEqual(["Lee", "Morgan"]);
  expect(paired.session).toMatchObject({ privateAcknowledged: true });
  expect(paired.favorites).toEqual([legacyCard!.id]);
});

for (const difficulty of ["easy", "medium", "bold"] as const) {
  test(`Random ${difficulty}: no adult gate and neither card pool can leak Flirty even at exhaustion`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/");
    await page.clock.fastForward(2000);
    await page.locator(".splash").waitFor({ state: "hidden" });
    await page.locator("button.mode-random").click();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await page
      .getByRole("textbox", { name: "Player name 1", exact: true })
      .fill("Alex");
    await page
      .getByRole("textbox", { name: "Player name 2", exact: true })
      .fill("Deniz");
    await page.getByRole("button", { name: "Add player", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Player name 3", exact: true })
      .fill("Sam");
    await chooseGenders(page, ["female", "undisclosed", "male"]);
    await page
      .locator(".difficulty")
      .getByRole("button", {
        name: new RegExp(`${t("en", `setup.${difficulty}`)}$`),
      })
      .click();
    await page
      .getByRole("button", { name: "Start the game", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Truth", exact: true }),
    ).toBeEnabled();
    const original = await saved(page);
    expect(original.ageConfirmed).toBe(false);
    expect(original.session).not.toHaveProperty("privateAcknowledged");
    for (const type of ["truth", "dare"] as const) {
      const allowed = catalog.filter(
        (card) =>
          card.language === "en" &&
          card.pack === "core" &&
          card.category !== "flirty" &&
          card.difficulty === difficulty &&
          card.type === type,
      );
      expect(allowed.length).toBeGreaterThan(1);
      const last = allowed.at(-1)!;
      const record = {
        ...original,
        session: {
          ...original.session,
          card: null,
          seen: allowed.slice(0, -1).map((card) => card.id),
          rounds: allowed.length - 1,
        },
      };
      await page.evaluate(
        (data) =>
          localStorage.setItem(
            "dareflip:v1",
            JSON.stringify({ version: 1, data }),
          ),
        record,
      );
      await page.reload();
      await page.clock.fastForward(2000);
      await page.locator(".splash").waitFor({ state: "hidden" });
      await page.locator(".resume-banner").click();
      await expect(page.getByRole("checkbox")).toHaveCount(0);
      await page
        .getByRole("button", { name: t("en", `game.${type}`), exact: true })
        .click();
      await expect(page.getByTestId("card-prompt")).toHaveText(last.text);
      expect((await saved(page)).session?.card).toEqual(last);
      await nextChoice(page, "en");
      // All Flirty IDs are still unseen: an accidental inclusion must produce a
      // card here, so this tests exclusion deterministically rather than by luck.
      await page
        .getByRole("button", { name: t("en", `game.${type}`), exact: true })
        .click();
      await expect(page.locator(".exhausted")).toContainText(
        t("en", "game.exhausted"),
      );
      await expect(page.getByTestId("card-prompt")).toHaveCount(0);
      expect((await saved(page)).session?.seen).toEqual(
        allowed.map((card) => card.id),
      );
    }
  });
}

test("forged current private cards are rejected in Random, groups, and unacknowledged saves", async ({
  page,
}) => {
  const card = catalog.find(
    (card) =>
      card.category === "flirty" &&
      card.language === "en" &&
      card.difficulty === "easy" &&
      card.type === "truth",
  )!;
  expect(card.id).toContain("flirty-v3-");
  await page.clock.install();
  await page.goto("/");
  await page.clock.fastForward(2000);
  for (const scenario of ["random", "group", "unacknowledged"] as const) {
    const base = legacyState(scenario === "unacknowledged" ? 2 : 3);
    const session = {
      ...base.session!,
      card,
      seen: [card.id],
      mode: scenario === "random" ? "random" : "flirty",
      ...(scenario === "group" ? { privateAcknowledged: true } : {}),
    };
    await page.evaluate(
      (data) =>
        localStorage.setItem(
          "dareflip:v1",
          JSON.stringify({ version: 1, data }),
        ),
      { ...base, session },
    );
    await page.reload();
    await page.clock.fastForward(2000);
    await page.locator(".splash").waitFor({ state: "hidden" });
    expect((await saved(page)).session?.card?.id, scenario).not.toBe(card.id);
    await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  }
});
