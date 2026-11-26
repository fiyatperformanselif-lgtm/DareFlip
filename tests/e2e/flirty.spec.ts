import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { t } from "../../src/i18n";
import type { Card, Difficulty, Kind } from "../../src/domain/types";
import type { State } from "../../src/state";
import { chooseGenders } from "../helpers/players";

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
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await start.click();
  await expect(page.getByRole("alert")).toHaveText(
    t(language, "setup.ageRequired"),
  );
  await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  await page.getByRole("checkbox").check();
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
