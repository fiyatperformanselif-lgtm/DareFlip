import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  dictionaries,
  hasTranslation,
  languages,
  localeInfo,
  normalizeLocale,
  t,
  translationProgress,
} from "./index";
import { en, type Key } from "./en";

const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)]
    .map((match) => match[1])
    .sort();

describe("locale detection and translation transparency", () => {
  it("offers exactly the requested 20 unique locales and native names", () => {
    expect(languages).toHaveLength(20);
    expect(new Set(languages.map(({ code }) => code)).size).toBe(20);
    expect(
      languages.every(
        ({ name, nativeName }) => name.length > 0 && nativeName.length > 0,
      ),
    ).toBe(true);
  });

  it("normalizes regional languages, Simplified Chinese and Norwegian variants", () => {
    expect(detectLanguage(["xx-YY", "tr-TR", "en-US"])).toBe("tr");
    expect(detectLanguage(["zh-CN"])).toBe("zh");
    expect(detectLanguage(["nb-NO"])).toBe("no");
    expect(detectLanguage(["nn-NO"])).toBe("no");
    expect(detectLanguage(["ar_EG"])).toBe("ar");
    expect(normalizeLocale("in-ID")).toBe("id");
    expect(detectLanguage(["xx"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });

  it("sets Arabic direction to RTL and every other locale to LTR", () => {
    expect(localeInfo("ar-SA").dir).toBe("rtl");
    expect(
      languages.filter(({ dir }) => dir === "rtl").map(({ code }) => code),
    ).toEqual(["ar"]);
    expect(localeInfo("unknown").code).toBe("en");
  });

  it("accurately marks complete versus partial interface catalogues", () => {
    const keys = Object.keys(en) as Key[];
    for (const language of languages) {
      const dictionary = dictionaries[language.code];
      const complete = keys.every(
        (key) =>
          typeof dictionary[key] === "string" &&
          dictionary[key]!.trim().length > 0,
      );
      expect(language.uiComplete, language.code).toBe(complete);
      expect(translationProgress(language.code).total).toBe(keys.length);
      expect(translationProgress(language.code).translated).toBe(
        Object.keys(dictionary).length,
      );
    }
  });

  it("provides actual translations for core controls in every listed locale", () => {
    const keys: Key[] = [
      "nav.play",
      "nav.favorites",
      "nav.packs",
      "nav.settings",
      "game.truth",
      "game.dare",
      "game.skip",
      "setup.start",
      "settings.partialUi",
      "settings.englishCards",
      "settings.contentFallback",
      "settings.translationStatus",
      "common.partial",
      "nav.main",
      "legal.languageNotice",
    ];
    for (const { code } of languages) {
      for (const key of keys)
        expect(hasTranslation(code, key), `${code}:${key}`).toBe(true);
    }
  });

  it("translates every gender selection label and recovery message in all 20 locales", () => {
    const keys: Key[] = [
      "setup.gender",
      "setup.genderPlaceholder",
      "setup.genderRequired",
      "setup.completeGenders",
      "gender.female",
      "gender.male",
      "gender.nonbinary",
      "gender.undisclosed",
    ];
    for (const { code } of languages) {
      for (const key of keys) {
        expect(
          hasTranslation(code, key),
          `${code}:${key} must not fall back`,
        ).toBe(true);
        expect(t(code, key).trim(), `${code}:${key}`).not.toBe("");
        expect(
          placeholders(t(code, key)),
          `${code}:${key} must not require inferred player data`,
        ).toEqual([]);
      }
      const options = [
        "gender.female",
        "gender.male",
        "gender.nonbinary",
        "gender.undisclosed",
      ] as const;
      expect(
        new Set(options.map((key) => t(code, key))).size,
        `${code}: distinct explicit options`,
      ).toBe(4);
      expect(options.map((key) => t(code, key))).not.toContain(
        t(code, "setup.genderPlaceholder"),
      );
    }
    expect(t("tr", "gender.female")).toBe("Kadın");
    expect(t("tr", "gender.male")).toBe("Erkek");
    expect(t("tr", "gender.nonbinary")).toBe("İkili olmayan");
    expect(t("tr", "gender.undisclosed")).toBe("Belirtmek istemiyorum");
    expect(t("tr", "setup.playerPlaceholder", { number: 20 })).toBe(
      "Oyuncu 20",
    );
  });

  it("falls back only for missing strings and exposes their missing status", () => {
    expect(hasTranslation("fr", "consent.body")).toBe(false);
    expect(t("fr", "consent.body")).toBe(en["consent.body"]);
    expect(t("fr", "nav.play")).toBe("Jouer");
    expect(languages.find(({ code }) => code === "fr")?.contentStatus).toBe(
      "unavailable",
    );
  });

  it("keeps interpolation placeholders intact across translations", () => {
    for (const language of languages) {
      for (const [key, value] of Object.entries(dictionaries[language.code])) {
        expect(placeholders(value), `${language.code}:${key}`).toEqual(
          placeholders(en[key as Key]),
        );
        expect(value.trim().length, `${language.code}:${key}`).toBeGreaterThan(
          0,
        );
      }
    }
    expect(t("tr", "game.turn", { name: "Deniz" })).toBe("Sıra sende, Deniz");
    expect(t("en", "game.cardCount", { number: 9 })).toBe("Card 9");
    expect(t("en", "game.turn")).toBe("Your turn, {name}");
  });
});
