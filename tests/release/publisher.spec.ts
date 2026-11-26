import { expect, test, type Page } from "@playwright/test";

// Synthetic browser-only fixtures; never written as publishing identity or contacted.
const configured = {
  name: "Publisher Fixture",
  supportEmail: "support@fixture-publisher.dev",
  websiteUrl: "https://fixture-publisher.dev/",
  privacyUrl: "https://fixture-publisher.dev/privacy",
  supportUrl: "https://fixture-publisher.dev/support",
};
const empty = {
  name: "",
  supportEmail: "",
  websiteUrl: "",
  privacyUrl: "",
  supportUrl: "",
};

async function publisherFixture(page: Page, publisher: typeof configured) {
  await page.route(
    (url) => url.pathname === "/src/config/publisher.json",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        headers: { "Cache-Control": "no-store" },
        body: `export default ${JSON.stringify(publisher)};`,
      }),
  );
  await page.context().route("https://fixture-publisher.dev/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><title>Synthetic publisher destination</title><h1>Synthetic publisher destination</h1></html>',
    }),
  );
  await page.goto("/");
  await page.locator(".splash").waitFor({ state: "hidden" });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
}
async function close(page: Page, label = "Close") {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: label, exact: true })
    .click();
}

// These checks verify public-link wiring against intercepted fixture destinations,
// not the availability of an actual publisher website or email inbox.
test("an unconfigured publisher is disclosed honestly in English and Turkish", async ({
  page,
}) => {
  await publisherFixture(page, empty);
  await page.getByRole("button", { name: "Support", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "The publisher’s support contact has not been configured yet.",
  );
  await expect(dialog.getByRole("link")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Privacy Policy", exact: true })
    .click();
  await expect(dialog.locator(".legal-language")).toHaveText(
    "English · Publisher details pending",
  );
  await expect(dialog.locator(".legal-text")).toHaveAttribute("lang", "en");
  await expect(dialog.locator(".legal-text")).toContainText(
    "Not configured yet",
  );
  await expect(dialog.locator(".legal-text")).not.toContainText("{{");
  await expect(
    dialog.getByRole("link", {
      name: "View public privacy policy",
      exact: true,
    }),
  ).toHaveCount(0);
  await close(page);
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("tr");
  await page.getByRole("button", { name: "Destek", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "Yayıncının destek iletişim bilgisi henüz ayarlanmadı.",
  );
  await expect(dialog.getByRole("link")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Gizlilik Politikası", exact: true })
    .click();
  await expect(dialog.locator(".legal-language")).toHaveText(
    "Türkçe · Yayıncı bilgileri bekleniyor",
  );
  await expect(dialog.locator(".legal-text")).toHaveAttribute("lang", "tr");
  await expect(dialog.locator(".legal-text")).toContainText(
    "Henüz yapılandırılmadı",
  );
  await expect(dialog.locator(".legal-text")).toContainText(
    "Bu sürümde reklamlar kapalı",
  );
});

test("configured publisher identity has real anchor targets and consistent ad-free legal copy", async ({
  page,
}) => {
  await publisherFixture(page, configured);
  await page.getByRole("button", { name: "Support", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(configured.name);
  await expect(dialog).not.toContainText("has not been configured");
  const email = dialog.getByRole("link", { name: /Email support/ });
  await expect(email).toHaveAttribute(
    "href",
    `mailto:${configured.supportEmail}`,
  );
  await email.focus();
  await expect(email).toBeFocused();
  const support = dialog.getByRole("link", {
    name: "Support website",
    exact: true,
  });
  await expect(support).toHaveAttribute("href", configured.supportUrl);
  await expect(support).toHaveAttribute("target", "_blank");
  await expect(support).toHaveAttribute("rel", "noopener noreferrer");
  const [supportPopup] = await Promise.all([
    page.waitForEvent("popup"),
    support.click(),
  ]);
  await expect(supportPopup).toHaveURL(configured.supportUrl);
  await expect(
    supportPopup.getByRole("heading", {
      name: "Synthetic publisher destination",
    }),
  ).toBeVisible();
  await supportPopup.close();
  await dialog
    .getByRole("button", { name: "Privacy Policy", exact: true })
    .click();
  const policy = dialog.locator(".legal-text");
  await expect(dialog.locator(".legal-language")).toHaveText("English");
  await expect(policy).toHaveAttribute("lang", "en");
  await expect(policy).toContainText(configured.name);
  await expect(policy).toContainText(configured.supportEmail);
  await expect(policy).toContainText("Advertising is disabled in this edition");
  await expect(policy).not.toContainText("Google AdMob");
  await expect(policy).not.toContainText(
    /\{\{|\[REQUIRED|Not configured|development draft/i,
  );
  const privacy = dialog.getByRole("link", {
    name: "View public privacy policy",
    exact: true,
  });
  await expect(privacy).toHaveAttribute("href", configured.privacyUrl);
  await expect(privacy).toHaveAttribute("target", "_blank");
  await expect(privacy).toHaveAttribute("rel", "noopener noreferrer");
  const [privacyPopup] = await Promise.all([
    page.waitForEvent("popup"),
    privacy.click(),
  ]);
  await expect(privacyPopup).toHaveURL(configured.privacyUrl);
  await expect(
    privacyPopup.getByRole("heading", {
      name: "Synthetic publisher destination",
    }),
  ).toBeVisible();
  await privacyPopup.close();
  await close(page);
  await page.getByRole("button", { name: "Terms of Use", exact: true }).click();
  await expect(dialog.locator(".legal-text")).toHaveAttribute("lang", "en");
  await expect(dialog.locator(".legal-text")).toContainText(configured.name);
  await expect(dialog.locator(".legal-text")).toContainText(
    "Advertising is disabled in this edition",
  );
  await expect(dialog.locator(".legal-text")).not.toContainText(
    /\{\{|Not configured|development draft/i,
  );
});

test("Turkish privacy and terms identify the rendered language and publisher without English draft text", async ({
  page,
}) => {
  await publisherFixture(page, configured);
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("tr");
  await page
    .getByRole("button", { name: "Gizlilik Politikası", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const policy = dialog.locator(".legal-text");
  await expect(dialog.locator(".legal-language")).toHaveText("Türkçe");
  await expect(policy).toHaveAttribute("lang", "tr");
  await expect(policy).toContainText("Yayıncı ve iletişim");
  await expect(policy).toContainText(configured.name);
  await expect(policy).toContainText(configured.supportEmail);
  await expect(policy).toContainText("Bu sürümde reklamlar kapalı");
  await expect(policy).not.toContainText(
    /\{\{|Not configured|Henüz yapılandırılmadı|development draft|Pre-release policy/i,
  );
  await expect(
    dialog.getByRole("link", {
      name: "Gizlilik politikasını web'de aç",
      exact: true,
    }),
  ).toHaveAttribute("href", configured.privacyUrl);
  await close(page, "Kapat");
  await page
    .getByRole("button", { name: "Kullanım Koşulları", exact: true })
    .click();
  await expect(dialog.locator(".legal-language")).toHaveText("Türkçe");
  await expect(policy).toHaveAttribute("lang", "tr");
  await expect(policy).toContainText("Yayıncı ve gönüllü oyun");
  await expect(policy).toContainText(configured.name);
  await expect(policy).toContainText("Bu sürümde reklamlar kapalıdır.");
  await expect(policy).not.toContainText(
    /\{\{|Not configured|Henüz yapılandırılmadı|development draft/i,
  );
});
