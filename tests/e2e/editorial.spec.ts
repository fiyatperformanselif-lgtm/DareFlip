import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { t } from "../../src/i18n";
import { chooseGenders } from "../helpers/players";

const archived = JSON.parse(
  readFileSync(
    new URL("../../src/content/archive-v1.json", import.meta.url),
    "utf8",
  ),
);
const current = JSON.parse(
  readFileSync(
    new URL("../../src/content/cards.json", import.meta.url),
    "utf8",
  ),
);
const oldCard = archived.find(
  (card: {
    language: string;
    category: string;
    difficulty: string;
    type: string;
  }) =>
    card.language === "en" &&
    card.category === "party" &&
    card.difficulty === "easy" &&
    card.type === "truth",
);

test("content update keeps archived current cards and favorites, then draws only the new edition", async ({
  page,
}) => {
  const state = {
    version: 1,
    locale: "en",
    sound: false,
    haptics: false,
    unlocked: false,
    ageConfirmed: false,
    favorites: [oldCard.id],
    session: {
      players: ["Alex", "Deniz"],
      genders: ["female", "male"],
      mode: "party",
      difficulty: "easy",
      seen: [oldCard.id],
      player: "Alex",
      card: oldCard,
      rounds: 1,
    },
  };
  await page.addInitScript((saved) => {
    if (!localStorage.getItem("dareflip:v1"))
      localStorage.setItem(
        "dareflip:v1",
        JSON.stringify({ version: 1, data: saved }),
      );
  }, state);
  await page.goto("/");
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(page.getByTestId("card-prompt")).toHaveText(oldCard.text);
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
  await expect(page.locator(".saved-card")).toContainText(oldCard.text);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Play", exact: true })
    .click();
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await page.getByRole("button", { name: "Skip freely", exact: true }).click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
  expect(saved.favorites).toEqual([oldCard.id]);
  expect(saved.session.card.id).toMatch(/-v2$/);
  expect(
    current.some(
      (card: { id: string; language: string }) =>
        card.id === saved.session.card.id && card.language === "en",
    ),
  ).toBe(true);
  expect(saved.session.seen).toContain(oldCard.id);
  await expect(page.getByTestId("card-prompt")).toHaveText(
    saved.session.card.text,
  );
});

test("new Turkish games use the translated current edition without an English card fallback", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("tr");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: t("tr", "nav.play"), exact: true })
    .click();
  await page.locator(".hero-play").click();
  await page
    .getByRole("textbox", {
      name: `${t("tr", "setup.playerName")} 1`,
      exact: true,
    })
    .fill("Deniz");
  await page
    .getByRole("textbox", {
      name: `${t("tr", "setup.playerName")} 2`,
      exact: true,
    })
    .fill("Alex");
  await chooseGenders(page, ["female", "male"], t("tr", "setup.gender"));
  await page
    .getByRole("button", { name: t("tr", "setup.start"), exact: true })
    .click();
  await page
    .getByRole("button", { name: t("tr", "game.truth"), exact: true })
    .click();
  await expect(page.getByTestId("card-prompt")).toHaveAttribute("lang", "tr");
  await expect(page.locator(".fallback")).toHaveCount(0);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
  expect(saved.session.card.id).toMatch(/-v2$/);
  expect(
    current.some(
      (card: { id: string; language: string; text: string }) =>
        card.id === saved.session.card.id &&
        card.language === "tr" &&
        card.text === saved.session.card.text,
    ),
  ).toBe(true);
});
