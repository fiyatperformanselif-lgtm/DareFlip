import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalText } from "./LegalText";

const publisher = {
  name: "Publisher Fixture",
  supportEmail: "support@fixture-publisher.dev",
  websiteUrl: "https://fixture-publisher.dev/",
  privacyUrl: "https://fixture-publisher.dev/privacy",
  supportUrl: "https://fixture-publisher.dev/support",
};

describe("shared in-app privacy and terms", () => {
  it("renders the explicit ad-free policy and configured identity without placeholders", () => {
    const html = renderToStaticMarkup(
      <LegalText
        page="privacy"
        language="en"
        publisher={publisher}
        adsEnabled={false}
      />,
    );
    expect(html).toContain(publisher.supportEmail);
    expect(html).toContain("Advertising is disabled");
    expect(html).not.toContain("Google AdMob");
    expect(html).not.toContain("{{");
    expect(html).not.toContain("[REQUIRED");
  });
  it("renders accurate advertising text and actual-language metadata in the other edition", () => {
    const html = renderToStaticMarkup(
      <LegalText
        page="privacy"
        language="tr"
        publisher={publisher}
        adsEnabled={true}
      />,
    );
    expect(html).toContain('lang="tr"');
    expect(html).toContain("Google AdMob");
    expect(html).toContain('href="https://policies.google.com/');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("escapes public names rather than executing markup from configuration", () => {
    const html = renderToStaticMarkup(
      <LegalText
        page="terms"
        language="en"
        publisher={{ ...publisher, name: "<script>fixture</script>" }}
        adsEnabled={false}
      />,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
