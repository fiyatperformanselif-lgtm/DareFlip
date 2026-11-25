import { expect, test, type Page } from "@playwright/test";
import { chooseGenders } from "../helpers/players";

async function enterNames(page: Page) {
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Alex");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill("Sam");
}
async function openSetup(page: Page) {
  await page.getByRole("button", { name: /Party / }).click();
  await enterNames(page);
}
async function persisted(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "hidden" });
});

test("every player explicitly chooses a gender; no value is inferred or preselected", async ({
  page,
}) => {
  await openSetup(page);
  for (let i = 1; i <= 2; i++) {
    const choice = page.getByRole("combobox", {
      name: `Gender ${i}`,
      exact: true,
    });
    await expect(choice).toHaveValue("");
    expect(
      await choice
        .locator("option")
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        ),
    ).toEqual(["", "female", "male", "nonbinary", "undisclosed"]);
  }
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/gender/i);
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Gender 1", exact: true })
    .selectOption("nonbinary");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/gender/i);
  await page
    .getByRole("combobox", { name: "Gender 2", exact: true })
    .selectOption("undisclosed");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeVisible();
  expect((await persisted(page)).session.genders).toEqual([
    "nonbinary",
    "undisclosed",
  ]);
});

test("all four choices persist with their players across reload and resume", async ({
  page,
}) => {
  await openSetup(page);
  for (let i = 3; i <= 4; i++) {
    await page.getByRole("button", { name: "Add player", exact: true }).click();
    await page
      .getByRole("textbox", { name: `Player name ${i}`, exact: true })
      .fill(`Guest ${i}`);
    await expect(
      page.getByRole("combobox", { name: `Gender ${i}`, exact: true }),
    ).toHaveValue("");
  }
  const genders = ["female", "male", "nonbinary", "undisclosed"] as const;
  await chooseGenders(page, genders);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeVisible();
  const before = await persisted(page);
  expect(before.session.genders).toEqual(genders);
  await page.reload();
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeVisible();
  expect((await persisted(page)).session).toEqual(before.session);
});

test("removing a player keeps subsequent gender choices aligned and a newly added player blank", async ({
  page,
}) => {
  await openSetup(page);
  for (let i = 3; i <= 4; i++) {
    await page.getByRole("button", { name: "Add player", exact: true }).click();
    await page
      .getByRole("textbox", { name: `Player name ${i}`, exact: true })
      .fill(`Guest ${i}`);
  }
  await chooseGenders(page, ["female", "male", "nonbinary", "undisclosed"]);
  await page
    .getByRole("button", { name: "Remove player 2", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Player name 2", exact: true }),
  ).toHaveValue("Guest 3");
  await expect(
    page.getByRole("combobox", { name: "Gender 2", exact: true }),
  ).toHaveValue("nonbinary");
  await expect(
    page.getByRole("combobox", { name: "Gender 3", exact: true }),
  ).toHaveValue("undisclosed");
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Player name 4", exact: true })
    .fill("New guest");
  await expect(
    page.getByRole("combobox", { name: "Gender 4", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/gender/i);
  await page
    .getByRole("combobox", { name: "Gender 4", exact: true })
    .selectOption("male");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  const session = (await persisted(page)).session;
  expect(session.players).toEqual(["Alex", "Guest 3", "Guest 4", "New guest"]);
  expect(session.genders).toEqual([
    "female",
    "nonbinary",
    "undisclosed",
    "male",
  ]);
});

test("legacy sessions collect missing choices without losing the current card, deck or favorites", async ({
  page,
}) => {
  await openSetup(page);
  await chooseGenders(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  const prompt = await page.getByTestId("card-prompt").innerText();
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  const before = await persisted(page);
  await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem("dareflip:v1")!);
    record.data.version = 1;
    delete record.data.session.genders;
    localStorage.setItem("dareflip:v1", JSON.stringify(record));
  });
  await page.reload();
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Player name 1", exact: true }),
  ).toHaveValue("Alex");
  await expect(
    page.getByRole("textbox", { name: "Player name 2", exact: true }),
  ).toHaveValue("Sam");
  await expect(
    page.getByRole("combobox", { name: "Gender 1", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Gender 2", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Player name 1", exact: true }),
  ).toHaveJSProperty("readOnly", true);
  await expect(
    page.getByRole("button", { name: "Add player", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/gender/i);
  await chooseGenders(page, ["female", "undisclosed"]);
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).toHaveText(prompt);
  const after = await persisted(page);
  expect(after.session.seen).toEqual(before.session.seen);
  expect(after.session.card).toEqual(before.session.card);
  expect(after.session.player).toEqual(before.session.player);
  expect(after.session.rounds).toEqual(before.session.rounds);
  expect(after.favorites).toEqual(before.favorites);
  expect(after.session.genders).toEqual(["female", "undisclosed"]);
});

test("Turkish setup labels gender choices accessibly and keeps disclosure optional", async ({
  page,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("tr");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Oyna", exact: true })
    .click();
  await page.locator(".hero-play").click();
  await page
    .getByRole("textbox", { name: "Oyuncu adı 1", exact: true })
    .fill("Deniz");
  await page
    .getByRole("textbox", { name: "Oyuncu adı 2", exact: true })
    .fill("Ece");
  await expect(
    page.getByRole("combobox", { name: "Cinsiyet 1", exact: true }),
  ).toHaveValue("");
  await chooseGenders(page, ["undisclosed", "female"], "Cinsiyet");
  await page.getByRole("button", { name: "Oyunu başlat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Doğruluk", exact: true }),
  ).toBeVisible();
  expect((await persisted(page)).session.genders).toEqual([
    "undisclosed",
    "female",
  ]);
});

test("gender choices are checked before adult-mode confirmation", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Flirty 18\+ / }).click();
  await enterNames(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/gender/i);
  await chooseGenders(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("consenting adults");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeVisible();
});
