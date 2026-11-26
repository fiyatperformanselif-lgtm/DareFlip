import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { t } from "../../src/i18n";
import { chooseGenders } from "../helpers/players";

for (const language of ["en", "tr"] as const) {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 844, height: 390 },
  ]) {
    test(`private ${language} ${viewport.width}px: named acknowledgements work with a keyboard and controls stay reachable`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.locator(".splash")).toHaveCount(0);
      if (language === "tr") {
        await page
          .getByRole("navigation")
          .getByRole("button", { name: "Settings", exact: true })
          .click();
        await page
          .getByRole("combobox", { name: "Language" })
          .selectOption("tr");
        await page
          .getByRole("navigation")
          .getByRole("button", { name: t(language, "nav.play"), exact: true })
          .click();
      }
      await page.locator("button.mode-flirty").click();
      for (const [index, name] of ["Alexandra Longname", "Deniz"].entries()) {
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

      const scan = async (screen: string) => {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        await testInfo.attach(`${screen}-axe`, {
          body: JSON.stringify({
            violations: result.violations,
            incomplete: result.incomplete,
          }),
          contentType: "application/json",
        });
        expect(result.violations).toEqual([]);
      };
      const noOverflow = async () => {
        const dimensions = await page.evaluate(() => {
          const main = document.querySelector<HTMLElement>(".main")!;
          return {
            viewport: document.documentElement.clientWidth,
            document: document.documentElement.scrollWidth,
            main: main.clientWidth,
            mainScroll: main.scrollWidth,
          };
        });
        expect(dimensions.document).toBeLessThanOrEqual(
          dimensions.viewport + 1,
        );
        expect(dimensions.mainScroll).toBeLessThanOrEqual(dimensions.main + 1);
      };

      await noOverflow();
      await scan("private-setup");
      for (const [index, name] of ["Alexandra Longname", "Deniz"].entries()) {
        const checkbox = page.getByRole("checkbox", {
          name: t(language, "setup.partnerConfirm", { name }),
          exact: true,
        });
        await checkbox.scrollIntoViewIfNeeded();
        await expect(checkbox).not.toBeChecked();
        const label = page.locator(".partner-checks label").nth(index);
        const box = await label.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await checkbox.focus();
        await page.keyboard.press("Space");
        await expect(checkbox).toBeChecked();
      }
      const start = page.getByRole("button", {
        name: t(language, "setup.start"),
        exact: true,
      });
      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeInViewport();
      await start.click();
      await noOverflow();
      await page
        .getByRole("button", { name: t(language, "game.truth"), exact: true })
        .click();
      await expect(page.getByTestId("card-prompt")).toBeFocused();
      await expect(page.locator(".turn-partner")).toContainText(
        /Alexandra Longname|Deniz/,
      );
      await scan("private-card");
      await noOverflow();
      for (const key of ["game.next", "game.skip"] as const) {
        const control = page.getByRole("button", {
          name: t(language, key),
          exact: true,
        });
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeInViewport();
        await expect(control).toBeEnabled();
      }
    });
  }
}
