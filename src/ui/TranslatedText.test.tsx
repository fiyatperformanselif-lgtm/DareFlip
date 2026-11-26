import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TranslatedText } from "./TranslatedText";

describe("translated interface language parts and bidirectional values", () => {
  it("overrides an Arabic parent for missing English guidance", () => {
    const html = renderToStaticMarkup(
      <div lang="ar" dir="rtl">
        <TranslatedText locale="ar" translationKey="setup.privateHowTo" />
      </div>,
    );
    expect(html).toContain(
      '<span lang="en" dir="ltr" data-translation-fallback="true">',
    );
    expect(html).toContain("On private cards");
  });

  it("keeps actual Arabic copy RTL without declaring a fallback", () => {
    const html = renderToStaticMarkup(
      <TranslatedText locale="ar" translationKey="nav.play" />,
    );
    expect(html).toBe('<span lang="ar" dir="rtl">العب</span>');
  });

  it("isolates a mixed-direction player name inside the resolved English sentence", () => {
    const html = renderToStaticMarkup(
      <TranslatedText
        locale="ar"
        translationKey="setup.partnerConfirm"
        values={{ name: "نور / Alex" }}
      />,
    );
    expect(html).toContain('<span lang="en" dir="ltr"');
    expect(html).toContain(
      '<bdi dir="auto">نور / Alex</bdi>: I am at least 18',
    );
    expect(html).not.toContain("{name}");
  });

  it("escapes user-supplied markup rather than treating an interpolated name as HTML", () => {
    const html = renderToStaticMarkup(
      <TranslatedText
        locale="en"
        translationKey="game.turn"
        values={{ name: '<img src="x" onerror="alert(1)">' }}
      />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain('<bdi dir="auto">&lt;img');
    expect(html).toContain("&quot;");
  });

  it("retains zero-valued interpolation and a missing placeholder", () => {
    expect(
      renderToStaticMarkup(
        <TranslatedText
          locale="ar"
          translationKey="game.cardCount"
          values={{ number: 0 }}
        />,
      ),
    ).toContain('<bdi dir="auto">0</bdi>');
    expect(
      renderToStaticMarkup(
        <TranslatedText locale="en" translationKey="game.turn" />,
      ),
    ).toContain("{name}");
  });
});
