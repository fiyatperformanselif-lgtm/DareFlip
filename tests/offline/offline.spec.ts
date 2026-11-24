import { test, expect } from "@playwright/test";
test("production shell cold reloads offline, resumes card and excludes third-party requests", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:4173") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page.getByRole("button", { name: /Party / }).click();
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Maya");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill("Leo");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  const prompt = await page.getByTestId("card-prompt").innerText();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /^Continue your game/ }).click();
  await expect(page.getByTestId("card-prompt")).toHaveText(prompt);
  await page.getByRole("button", { name: "Skip freely", exact: true }).click();
  await page.getByRole("button", { name: "Dare", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).not.toBeEmpty();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("storage denial preserves gameplay and discloses unsaved progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(
    "Device storage is unavailable",
  );
  await page.getByRole("button", { name: /Party / }).click();
  await page
    .getByRole("textbox", { name: "Player name 1", exact: true })
    .fill("Maya");
  await page
    .getByRole("textbox", { name: "Player name 2", exact: true })
    .fill("Leo");
  await page
    .getByRole("button", { name: "Start the game", exact: true })
    .click();
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await expect(page.getByTestId("card-prompt")).not.toBeEmpty();
});
