import { describe, expect, it } from "vitest";
import { cards, contentLanguage, contentStats } from "../content";
import { dailyCard, drawCard, eligibleCards, pickPlayer } from "./engine";
import type { DrawOptions } from "./types";

const options: DrawOptions = {
  mode: "party",
  difficulty: "easy",
  type: "truth",
  language: "en",
  seen: [],
};

describe("content integrity", () => {
  it("has unique localized IDs and genuinely distinct prompts", () => {
    const keys = cards.map((card) => `${card.id}:${card.language}`);
    expect(new Set(keys).size).toBe(cards.length);
    for (const language of ["en", "tr"]) {
      const texts = cards
        .filter((card) => card.language === language)
        .map((card) => card.text.trim().toLocaleLowerCase());
      expect(new Set(texts).size).toBe(texts.length);
    }
    expect(contentStats.englishOriginals).toBe(192);
    expect(contentStats.turkishTranslations).toBe(90);
  });

  it("checks metadata and canonical translation alignment", () => {
    for (const card of cards) {
      expect(card.text.length).toBeGreaterThan(20);
      expect(["couples", "party", "flirty", "deep", "crazy"]).toContain(
        card.category,
      );
      expect(["easy", "medium", "bold"]).toContain(card.difficulty);
      expect(["truth", "dare"]).toContain(card.type);
      expect(["core", "afterglow"]).toContain(card.pack);
      if (card.language === "tr") {
        const original = cards.find(
          (candidate) =>
            candidate.id === card.id && candidate.language === "en",
        );
        expect(original).toBeDefined();
        expect({ ...card, text: "", language: "" }).toEqual({
          ...original,
          text: "",
          language: "",
        });
      }
      if (card.category === "flirty") expect(card.sensitive).toBe(true);
    }
  });

  it("has a playable core pool for every category/difficulty/type in supported content languages", () => {
    for (const language of ["en", "tr"]) {
      for (const mode of [
        "couples",
        "party",
        "flirty",
        "deep",
        "crazy",
        "random",
      ] as const) {
        for (const difficulty of ["easy", "medium", "bold"] as const) {
          for (const type of ["truth", "dare"] as const) {
            expect(
              eligibleCards({ ...options, language, mode, difficulty, type })
                .length,
            ).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });
});

describe("draw engine", () => {
  it("never repeats a card before exhaustion and requires an explicit reset", () => {
    const seen: string[] = [];
    const pool = eligibleCards(options);
    for (let n = 0; n < pool.length; n++) {
      const result = drawCard({ ...options, seen }, () => 0.5);
      expect(result.exhausted).toBe(false);
      expect(result.card).not.toBeNull();
      expect(seen).not.toContain(result.card!.id);
      seen.push(result.card!.id);
    }
    expect(drawCard({ ...options, seen })).toEqual({
      card: null,
      exhausted: true,
    });
    expect(drawCard({ ...options, seen: [] }).card).not.toBeNull();
  });

  it("filters exact difficulty, kind, category, language, and unlocked packs", () => {
    const pool = eligibleCards({
      ...options,
      mode: "couples",
      difficulty: "bold",
      type: "dare",
      language: "tr-TR",
    });
    expect(pool).toHaveLength(6);
    expect(
      pool.every(
        (card) =>
          card.category === "couples" &&
          card.difficulty === "bold" &&
          card.type === "dare" &&
          ["tr", "en"].includes(card.language) &&
          card.pack === "core",
      ),
    ).toBe(true);
    expect(pool.filter((card) => card.language === "tr")).toHaveLength(3);
    expect(new Set(pool.map((card) => card.id)).size).toBe(pool.length);
    const locked = eligibleCards({ ...options, mode: "random" });
    const unlocked = eligibleCards({
      ...options,
      mode: "random",
      unlockedPacks: ["core", "afterglow"],
    });
    expect(locked.every((card) => card.pack === "core")).toBe(true);
    expect(unlocked.length).toBeGreaterThan(locked.length);
    const translatedUnlocked = eligibleCards({
      ...options,
      mode: "random",
      language: "tr",
      unlockedPacks: ["core", "afterglow"],
    });
    expect(
      translatedUnlocked.some(
        (card) => card.pack === "afterglow" && card.language === "en",
      ),
    ).toBe(true);
  });

  it("shares canonical seen IDs between translations", () => {
    const translated = eligibleCards({ ...options, language: "tr" });
    expect(
      drawCard({
        ...options,
        language: "tr",
        seen: translated.map((card) => card.id),
      }).exhausted,
    ).toBe(true);
  });

  it("falls back explicitly to English for unavailable locales", () => {
    expect(contentLanguage("ar-SA")).toBe("en");
    expect(
      eligibleCards({ ...options, language: "de" }).every(
        (card) => card.language === "en",
      ),
    ).toBe(true);
  });

  it("rejects invalid RNG rather than returning undefined", () => {
    expect(() => drawCard(options, () => 1)).toThrow(RangeError);
    expect(() => drawCard(options, () => -0.1)).toThrow(RangeError);
  });
});

describe("player selection", () => {
  it("covers every eligible player uniformly across equal RNG buckets", () => {
    const players = ["A", "B", "C", "D"];
    expect(
      [0, 1, 2, 3].map((n) =>
        pickPlayer(players, undefined, () => (n + 0.5) / 4),
      ),
    ).toEqual(players);
    expect(
      [0, 1, 2].map((n) => pickPlayer(players, "B", () => (n + 0.5) / 3)),
    ).toEqual(["A", "C", "D"]);
  });
  it("handles empty and one-player inputs safely", () => {
    expect(pickPlayer([])).toBeNull();
    expect(pickPlayer(["A"], "A")).toBe("A");
  });
});

describe("daily card", () => {
  it("is stable throughout a UTC date and never contains sensitive content", () => {
    expect(dailyCard("en", new Date("2026-11-24T00:00:00Z"))).toEqual(
      dailyCard("en", new Date("2026-11-24T23:59:59Z")),
    );
    for (let day = 1; day <= 28; day++) {
      expect(
        dailyCard(
          "en",
          new Date(`2026-02-${String(day).padStart(2, "0")}T12:00:00Z`),
        ).sensitive,
      ).toBe(false);
    }
  });
});
