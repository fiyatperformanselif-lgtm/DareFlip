import type { Page } from "@playwright/test";

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
