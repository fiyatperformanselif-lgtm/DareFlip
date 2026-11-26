import { expect, type Page } from "@playwright/test";

export type GenderChoice = "female" | "male" | "nonbinary" | "undisclosed";

/** Explicit selections, including the valid choice not to disclose. No implicit defaults. */
export async function chooseGenders(
  page: Page,
  genders: readonly GenderChoice[] = ["female", "male"],
  label = "Gender",
) {
  for (const [index, gender] of genders.entries()) {
    await page
      .getByRole("combobox", { name: `${label} ${index + 1}`, exact: true })
      .selectOption(gender);
  }
}

/** Both named partners make their own current-session adult/voluntary choice. */
export async function confirmPartners(page: Page) {
  const confirmations = page.getByRole("checkbox");
  await expect(confirmations).toHaveCount(2);
  for (const checkbox of await confirmations.all()) await checkbox.check();
}
