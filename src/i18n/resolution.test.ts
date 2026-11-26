import { describe, expect, it } from "vitest";
import {
  dictionaries,
  hasTranslation,
  languages,
  resolveTranslation,
  t,
  translationAttrs,
} from "./index";
import { en } from "./en";

describe("actual language of translated interface text", () => {
  it("marks a missing Arabic private explanation as English and LTR", () => {
    expect(resolveTranslation("ar", "setup.privateHowTo")).toEqual({
      text: en["setup.privateHowTo"],
      lang: "en",
      dir: "ltr",
      fallback: true,
    });
    expect(translationAttrs("ar", "setup.partnerConfirm")).toEqual({
      lang: "en",
      dir: "ltr",
    });
  });

  it("retains Arabic and RTL for strings that actually have an Arabic translation", () => {
    expect(resolveTranslation("ar", "nav.play")).toEqual({
      text: dictionaries.ar["nav.play"],
      lang: "ar",
      dir: "rtl",
      fallback: false,
    });
    expect(translationAttrs("ar", "settings.contentFallback")).toEqual({
      lang: "ar",
      dir: "rtl",
    });
  });

  it("uses presence rather than English-string equality to decide fallback", () => {
    expect(dictionaries.de["mode.party"]).toBe(en["mode.party"]);
    expect(resolveTranslation("de", "mode.party")).toMatchObject({
      lang: "de",
      dir: "ltr",
      fallback: false,
    });
  });

  it("preserves full English and Turkish copy and existing plain-string interpolation", () => {
    expect(resolveTranslation("en", "game.turn", { name: "نور" })).toEqual({
      text: "Your turn, نور",
      lang: "en",
      dir: "ltr",
      fallback: false,
    });
    expect(resolveTranslation("tr", "game.turn", { name: "Deniz" })).toEqual({
      text: "Sıra sende, Deniz",
      lang: "tr",
      dir: "ltr",
      fallback: false,
    });
    expect(t("ar", "game.cardCount", { number: 0 })).toBe("Card 0");
    expect(
      resolveTranslation("ar", "setup.partnerConfirm", { name: "نور" }).text,
    ).toBe(t("ar", "setup.partnerConfirm", { name: "نور" }));
    expect(t("en", "game.turn")).toBe("Your turn, {name}");
  });

  it("interpolates exhaustion counts and types without implying a silent deck reset", () => {
    expect(t("en", "game.remainingCards", { type: "Truth", number: 0 })).toBe(
      "Truth cards left: 0",
    );
    expect(
      t("tr", "game.remainingCards", { type: "Doğruluk", number: 0 }),
    ).toBe("Kalan Doğruluk kartı: 0");
    expect(
      resolveTranslation("ar", "game.exhaustedType", { type: "Dare" }),
    ).toEqual({
      text: "No unseen Dare cards left at this difficulty.",
      lang: "en",
      dir: "ltr",
      fallback: true,
    });
    expect(t("tr", "game.exhaustedType", { type: "Cesaret" })).toBe(
      "Bu zorlukta oynanmamış Cesaret kartı kalmadı.",
    );
  });

  it("does not accidentally substitute inherited object properties", () => {
    const inherited: Record<string, string> = Object.create({
      name: "inherited",
    });
    expect(t("en", "game.turn", inherited)).toBe("Your turn, {name}");
  });

  it("keeps incomplete locale flags and cards honestly unavailable", () => {
    expect(
      languages
        .filter((language) => language.uiComplete)
        .map((language) => language.code),
    ).toEqual(["en", "tr"]);
    for (const language of languages.filter(
      (language) => !language.uiComplete,
    )) {
      expect(language.contentStatus).toBe("unavailable");
      expect(hasTranslation(language.code, "setup.privateHowTo")).toBe(false);
      expect(
        resolveTranslation(language.code, "setup.privateHowTo").fallback,
      ).toBe(true);
    }
  });
});
