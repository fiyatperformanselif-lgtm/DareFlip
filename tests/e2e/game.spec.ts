import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  chooseGenders,
  confirmPartners,
  type GenderChoice,
} from "../helpers/players";

async function home(page: Page) {
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "hidden" });
}
async function setup(page: Page, mode = "Party") {
  await page.getByRole("button", { name: new RegExp(`${mode} `) }).click();
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Alex");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill("Sam");
  await chooseGenders(page);
}
async function begin(page: Page) {
  await setup(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Your turn,/ }),
  ).toBeVisible();
}
async function next(page: Page, skip = false) {
  await page
    .getByRole("button", {
      name: skip ? "Skip freely" : "Next turn",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Truth", exact: true }),
  ).toBeEnabled();
}
async function leaveToHome(page: Page) {
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Back", exact: true })
    .click();
}

// These browser flows make no claims about native SDK or physical-device behavior.
test.beforeEach(async ({ page }) => {
  await home(page);
});

test("truth, dare, optional skip, favorites, pause and resume persist across reload", async ({
  page,
}) => {
  await begin(page);
  const firstPlayer = await page
    .getByRole("heading", { name: /^Your turn,/ })
    .innerText();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  const firstPrompt = await page.getByTestId("card-prompt").innerText();
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove saved card", exact: true }),
  ).toBeVisible();
  await next(page, true);
  await expect(
    page.getByRole("heading", { name: /^Your turn,/ }),
  ).not.toHaveText(firstPlayer);
  await page.getByRole("button", { name: "Dare", exact: true }).click();
  const darePrompt = await page.getByTestId("card-prompt").innerText();
  expect(darePrompt).not.toEqual(firstPrompt);
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep playing", exact: true })
    .click();
  await expect(page.getByTestId("card-prompt")).toHaveText(darePrompt);
  await leaveToHome(page);
  await page.reload();
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(page.getByTestId("card-prompt")).toHaveText(darePrompt);
  await leaveToHome(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Saved", exact: true })
    .click();
  await expect(page.locator(".saved-card")).toHaveCount(1);
  await expect(page.locator(".saved-card")).toContainText(firstPrompt);
  await page
    .getByRole("button", { name: "Remove saved card", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your collection starts here." }),
  ).toBeVisible();
});

test("all matching cards remain distinct until an explicit fresh deck", async ({
  page,
}) => {
  await begin(page);
  const prompts = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Truth", exact: true }).click();
    const prompt = await page.getByTestId("card-prompt").innerText();
    expect(prompts.has(prompt)).toBe(false);
    prompts.add(prompt);
    await next(page);
  }
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(
    page.getByText("You’ve explored every matching card!", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("card-prompt")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start a fresh deck", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  expect(prompts.has(await page.getByTestId("card-prompt").innerText())).toBe(
    true,
  );
});

test("validates blank and duplicate names and enforces 20-player limit", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Party / }).click();
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Add at least 2 players.");
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Alex");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill(" alex ");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Give each player a different name.",
  );
  for (let i = 2; i < 20; i++)
    await page.getByRole("button", { name: "Add player", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveCount(20);
  await expect(
    page.getByRole("button", { name: "Add player", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Remove player 20", exact: true })
    .click();
  await expect(page.getByRole("textbox")).toHaveCount(19);
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  for (let i = 1; i <= 20; i++)
    await page
      .getByRole("textbox", { name: `Player name ${i}`, exact: true })
      .fill(`Player ${i}`);
  await chooseGenders(
    page,
    Array.from(
      { length: 20 },
      (_, i) =>
        (["female", "male", "nonbinary", "undisclosed"] as GenderChoice[])[
          i % 4
        ],
    ),
  );
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.locator(".player-dots span")).toHaveCount(20);
  await expect(
    page.getByRole("button", { name: "Spin the bottle", exact: true }),
  ).toBeEnabled();
});

test("private Flirty requires both partner confirmations and permits free skips", async ({
  page,
}) => {
  await setup(page, "Flirty 18\\+");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("partners");
  await confirmPartners(page);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).not.toBeEmpty();
  await next(page, true);
  await expect(
    page.getByRole("button", { name: "Dare", exact: true }),
  ).toBeEnabled();
});

test("daily question, language coverage disclosure, and Arabic RTL work", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Card of the day/ }).click();
  const dailyText = await page.locator(".daily-prompt").innerText();
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Saved", exact: true })
    .click();
  await expect(page.locator(".saved-card")).toContainText(dailyText);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Language" }).locator("option"),
  ).toHaveCount(20);
  await page.getByRole("combobox", { name: "Language" }).selectOption("tr");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(
    page.getByRole("heading", { name: "Tam sana göre." }),
  ).toBeVisible();
  await expect(page.locator(".translation-note")).not.toContainText("sınırlı");
  await expect(page.locator(".translation-note")).toContainText("tamam");
  await page.getByRole("combobox", { name: "Dil" }).selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator(".translation-note")).toContainText("الإنجليزية");
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
});

test("no web ad requests, no fake reward unlock, and local data reset", async ({
  page,
}) => {
  const adRequests: string[] = [];
  page.on("request", (request) => {
    if (/googlesyndication|doubleclick|googleads|adservice/.test(request.url()))
      adRequests.push(request.url());
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Packs", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Watch an optional ad to unlock",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No reward ad is available",
  );
  await expect(
    page.getByRole("button", {
      name: "Watch an optional ad to unlock",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ad privacy choices", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manage ad privacy", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "This web version makes no ad requests.",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Play", exact: true })
    .click();
  await begin(page);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  await leaveToHome(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const sound = page.getByRole("switch", {
    name: "Sound effects",
    exact: true,
  });
  await sound.click();
  await expect(sound).toHaveAttribute("aria-checked", "false");
  await page
    .getByRole("button", { name: "Reset local data", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Continue your game/ }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Saved", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your collection starts here." }),
  ).toBeVisible();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
  expect(state.session).toBeNull();
  expect(state.unlocked).toBe(false);
  expect(state.favorites).toEqual([]);
  expect(state.sound).toBe(true);
  expect(adRequests).toEqual([]);
});

test("loaded application remains playable offline and sharing downloads a real PNG", async ({
  page,
  context,
}) => {
  await begin(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).not.toBeEmpty();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Share card", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  expect(await download.failure()).toBeNull();
  const file = await download.path();
  expect(file).not.toBeNull();
  const png = await readFile(file!);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBeGreaterThan(300);
  expect(png.readUInt32BE(20)).toBeGreaterThan(300);
  await next(page, true);
  await page.getByRole("button", { name: "Dare", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).not.toBeEmpty();
  await context.setOffline(false);
});

test("all six modes, three difficulties, bottle selection and ending games work", async ({
  page,
}) => {
  test.setTimeout(75_000);
  const modes = [
    "Couples",
    "Party",
    "Flirty 18\\+",
    "Deep Talk",
    "Crazy Fun",
    "Random",
  ];
  const levels = ["Easy", "Medium", "Bold"];
  for (const [index, mode] of modes.entries()) {
    await setup(page, mode);
    const difficulty = page.getByRole("button", {
      name: new RegExp(`${levels[index % 3]}$`),
    });
    await difficulty.click();
    await expect(difficulty).toHaveAttribute("aria-pressed", "true");
    if (index === 2) await confirmPartners(page);
    if (index === 5) await expect(page.getByRole("checkbox")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Start the game", exact: true })
      .click();
    const firstPlayer = await page
      .getByRole("heading", { name: /^Your turn,/ })
      .innerText();
    await page
      .getByRole("button", { name: "Spin the bottle", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Truth", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: /^Your turn,/ }),
    ).not.toHaveText(firstPlayer);
    await page.getByRole("button", { name: "Truth", exact: true }).click();
    await expect(page.getByTestId("card-prompt")).not.toBeEmpty();
    await page
      .getByRole("button", { name: "Take a break", exact: true })
      .click();
    await page.getByRole("button", { name: "End game", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /^Continue your game/ }),
    ).toHaveCount(0);
  }
});

test("privacy, terms, support and preference controls are usable", async ({
  page,
}) => {
  const configuredPublisher = JSON.parse(
    await readFile(
      new URL("../../src/config/publisher.json", import.meta.url),
      "utf8",
    ),
  ) as { name: string; supportEmail: string };
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  for (const name of ["Sound effects", "Haptic feedback"]) {
    const preference = page.getByRole("switch", { name, exact: true });
    await preference.click();
    await expect(preference).toHaveAttribute("aria-checked", "false");
    await preference.click();
    await expect(preference).toHaveAttribute("aria-checked", "true");
  }
  for (const name of ["Privacy Policy", "Terms of Use", "Support"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    if (name === "Support") {
      const email = configuredPublisher.supportEmail.trim();
      const emailLink = dialog.locator('a[href^="mailto:"]');
      if (configuredPublisher.name.trim())
        await expect(dialog.locator(".publisher-name")).toHaveText(
          configuredPublisher.name.trim(),
        );
      if (email) {
        await expect(emailLink).toHaveCount(1);
        await expect(emailLink).toBeVisible();
        await expect(emailLink).toContainText(email);
        const href = await emailLink.getAttribute("href");
        expect(decodeURIComponent(href!.slice("mailto:".length))).toBe(email);
        await expect(dialog).not.toContainText(
          "The publisher’s support contact has not been configured yet.",
        );
      } else {
        await expect(emailLink).toHaveCount(0);
        await expect(dialog).toContainText(
          "The publisher’s support contact has not been configured yet.",
        );
      }
    } else await expect(dialog.locator(".legal-text")).not.toBeEmpty();
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
});
