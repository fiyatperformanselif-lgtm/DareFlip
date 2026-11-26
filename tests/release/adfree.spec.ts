import { expect, test, type Page } from "@playwright/test";
import { chooseGenders } from "../helpers/players";

async function home(page: Page) {
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "hidden" });
}
async function startParty(page: Page) {
  await page.locator(".hero-play").click();
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Alex");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill("Deniz");
  await chooseGenders(page, ["nonbinary", "undisclosed"]);
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
}

test("ad-free UI has no ad controls or fake entitlement while normal play remains available", async ({
  page,
}) => {
  const adRequests: string[] = [];
  page.on("request", (request) => {
    if (/googlesyndication|doubleclick|googleads|adservice/.test(request.url()))
      adRequests.push(request.url());
  });
  await home(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Packs", exact: true })
    .click();
  await expect(page.locator(".afterglow-pack")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /Watch an optional ad|Ad privacy choices/,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "This edition has no ads. The included collection works offline.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ad privacy choices", exact: true }),
  ).toHaveCount(0);

  // Exercise the actual dev-module export as a stale UI/native caller would.
  // Native SDK zero-call behavior is tested with plugin mocks in ads.test.ts.
  const runtime = await page.evaluate(async () => {
    const path = "/src/services/ads.ts";
    const { ads, advertisingEnabled } = await import(path);
    const enabledResult = await ads.enableAds({ attOptIn: true });
    const privacyResult = await ads.privacyOptions();
    await ads.updatePlacement({
      menu: false,
      sensitive: false,
      naturalBreak: true,
    });
    const interstitial = await ads.maybeInterstitial({
      cardsPlayed: 10,
      mode: "party",
      sensitive: false,
      naturalBreak: true,
    });
    const reward = await ads.rewarded();
    await ads.disableAds();
    return {
      advertisingEnabled,
      enabledResult,
      privacyResult,
      interstitial,
      reward,
      state: ads.state,
    };
  });
  expect(runtime).toEqual({
    advertisingEnabled: false,
    enabledResult: "off",
    privacyResult: "off",
    interstitial: false,
    reward: false,
    state: "off",
  });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("dareflip:v1")!).data.unlocked,
    ),
  ).toBe(false);

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Play", exact: true })
    .click();
  await startParty(page);
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).toBeVisible();
  await page.getByRole("button", { name: "Save card", exact: true }).click();
  await page.getByRole("button", { name: "Skip freely", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Dare", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Dare", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).toBeVisible();
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await page.reload();
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(page.getByTestId("card-prompt")).toBeVisible();
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
  expect(restored.unlocked).toBe(false);
  expect(restored.session.card.pack).toBe("core");
  expect(restored.favorites).toHaveLength(1);
  expect(adRequests).toEqual([]);
});

test("an already earned pack remains usable without an ad CTA or new entitlement grant", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "dareflip:v1",
      JSON.stringify({
        version: 1,
        data: {
          version: 1,
          locale: "en",
          sound: false,
          haptics: false,
          favorites: [],
          session: null,
          unlocked: true,
          ageConfirmed: false,
        },
      }),
    );
  });
  await home(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Packs", exact: true })
    .click();
  const pack = page.locator(".afterglow-pack");
  await expect(pack).toBeVisible();
  await expect(pack.getByText("Unlocked", { exact: true })).toBeVisible();
  await expect(pack).toContainText("This edition has no ads.");
  await expect(
    pack.getByRole("button", { name: /Watch an optional ad/ }),
  ).toHaveCount(0);
  await expect(pack).not.toContainText("only after the ad reward is confirmed");
  await pack.getByRole("button", { name: "Let’s play", exact: true }).click();
  await startParty(page);
  await page.evaluate(async () => {
    const path = "/src/domain/engine.ts";
    const { eligibleCards } = await import(path);
    const pool = eligibleCards({
      mode: "party",
      difficulty: "easy",
      type: "truth",
      language: "en",
      seen: [],
      unlockedPacks: ["core", "afterglow"],
    });
    const index = pool.findIndex(
      (card: { pack: string }) => card.pack === "afterglow",
    );
    if (index < 0)
      throw new Error("Previously earned Afterglow card is unavailable");
    // Select a real eligible bonus card independently of catalog ordering.
    Math.random = () => (index + 0.5) / pool.length;
  });
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).toBeVisible();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dareflip:v1")!).data,
  );
  expect(state.unlocked).toBe(true);
  expect(state.session.card.pack).toBe("afterglow");
});
