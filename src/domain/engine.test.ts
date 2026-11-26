import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  archivedCards,
  archivedFlirtyCards,
  cards,
  contentLanguage,
  contentStats,
  lookupCard,
  persistedCards,
} from "../content";
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
  it("keeps the original committed v1 corpus unchanged for saved-card restoration", () => {
    // Hash of parsed HEAD:src/content/cards.json before the v2 editorial rewrite.
    // Whitespace-only JSON formatting changes do not alter this preservation check.
    expect(
      createHash("sha256").update(JSON.stringify(archivedCards)).digest("hex"),
    ).toBe("5492a2cb17093a56061c3325a2a247b25518b8385ef99c610917b1ad6037a6a5");
  });

  it("keeps every replaced Flirty v2 row unchanged for saved-card restoration", () => {
    expect(archivedFlirtyCards).toHaveLength(72);
    expect(
      createHash("sha256")
        .update(JSON.stringify(archivedFlirtyCards))
        .digest("hex"),
    ).toBe("186db245b88d20233450dc4f8ded20cf0d329f38ffe4f74706e73441ca4a33f4");
  });

  it("has unique localized IDs and distinct prompt text", () => {
    const keys = cards.map((card) => `${card.id}:${card.language}`);
    expect(new Set(keys).size).toBe(cards.length);
    for (const language of ["en", "tr"]) {
      const texts = cards
        .filter((card) => card.language === language)
        .map((card) => card.text.trim().toLocaleLowerCase());
      expect(new Set(texts).size).toBe(texts.length);
    }
    expect(contentStats.englishOriginals).toBe(192);
    expect(contentStats.turkishTranslations).toBe(192);
    expect(contentStats.uniqueConcepts).toBe(192);
    expect(cards).toHaveLength(384);
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
      if (card.category === "flirty")
        expect(card.id).toMatch(
          /^flirty-v3-(easy|medium|bold)-(truth|dare)-0[1-6]$/,
        );
      else expect(card.id).toMatch(/-v2$/);
      if (card.language === "en") {
        const translated = cards.find(
          (candidate) =>
            candidate.id === card.id && candidate.language === "tr",
        );
        expect(translated).toBeDefined();
        expect({ ...card, text: "", language: "" }).toEqual({
          ...translated,
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
              eligibleCards({
                ...options,
                language,
                mode,
                difficulty,
                type,
                privateSession: mode === "flirty",
              }).length,
            ).toBeGreaterThanOrEqual(6);
            expect(
              eligibleCards({
                ...options,
                language,
                mode,
                difficulty,
                type,
                privateSession: mode === "flirty",
              }).every((card) => card.language === language),
            ).toBe(true);
          }
        }
      }
    }
  });

  it("keeps editorial revisions disjoint and excludes archived rows from active statistics", () => {
    const activeIds = new Set(cards.map((card) => card.id));
    expect(archivedCards).toHaveLength(282);
    expect(
      archivedCards.every(
        (card) => !card.id.endsWith("-v2") && !activeIds.has(card.id),
      ),
    ).toBe(true);
    expect(
      archivedFlirtyCards.every(
        (card) => card.id.endsWith("-v2") && !activeIds.has(card.id),
      ),
    ).toBe(true);
    expect(persistedCards).toHaveLength(
      cards.length + archivedCards.length + archivedFlirtyCards.length,
    );
    expect(
      new Set(persistedCards.map((card) => `${card.id}:${card.language}`)).size,
    ).toBe(persistedCards.length);
    expect(contentStats.englishOriginals).toBe(
      cards.filter((card) => card.language === "en").length,
    );
    expect(contentStats.turkishTranslations).toBe(
      cards.filter((card) => card.language === "tr").length,
    );
  });

  it("restores exact saved revisions with explicit translation fallback", () => {
    for (const card of persistedCards) {
      expect(lookupCard(card.id, card.language)).toEqual(card);
    }
    const oldEnglishOnly = archivedCards.find(
      (card) =>
        card.language === "en" &&
        !archivedCards.some(
          (translation) =>
            translation.id === card.id && translation.language === "tr",
        ),
    )!;
    expect(lookupCard(oldEnglishOnly.id, "tr")).toEqual(oldEnglishOnly);
    const activeEnglish = cards.find((card) => card.language === "en")!;
    expect(lookupCard(activeEnglish.id, "tr-TR")?.language).toBe("tr");
    expect(lookupCard(activeEnglish.id, "de-DE")).toEqual(activeEnglish);
    expect(lookupCard("unknown-card", "tr")).toBeUndefined();
    expect(lookupCard(oldEnglishOnly.id)?.id).toBe(oldEnglishOnly.id);
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
          card.language === "tr" &&
          card.pack === "core",
      ),
    ).toBe(true);
    expect(pool.filter((card) => card.language === "tr")).toHaveLength(6);
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
        (card) => card.pack === "afterglow" && card.language === "tr",
      ),
    ).toBe(true);
  });

  it("never draws archived cards even when a restored session contains old seen IDs", () => {
    const activeIds = new Set(cards.map((card) => card.id));
    const oldSeen = [
      ...new Set(
        [...archivedCards, ...archivedFlirtyCards].map((card) => card.id),
      ),
    ];
    for (const language of ["en", "tr"]) {
      for (const type of ["truth", "dare"] as const) {
        const config = {
          ...options,
          mode: "random" as const,
          language,
          type,
          seen: oldSeen,
          unlockedPacks: ["core", "afterglow"] as const,
        };
        const pool = eligibleCards(config);
        expect(
          pool.every(
            (card) => activeIds.has(card.id) && card.id.endsWith("-v2"),
          ),
        ).toBe(true);
        const seen = [...oldSeen];
        for (let index = 0; index < pool.length; index++) {
          const result = drawCard({ ...config, seen }, () => 0);
          expect(result.card).not.toBeNull();
          expect(activeIds.has(result.card!.id)).toBe(true);
          expect(oldSeen).not.toContain(result.card!.id);
          seen.push(result.card!.id);
        }
        expect(drawCard({ ...config, seen }).exhausted).toBe(true);
      }
    }
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

  it("requires an explicit private-session flag for every Flirty pool", () => {
    for (const language of ["en", "tr"]) {
      for (const difficulty of ["easy", "medium", "bold"] as const) {
        for (const type of ["truth", "dare"] as const) {
          const config = {
            ...options,
            mode: "flirty" as const,
            language,
            difficulty,
            type,
          };
          expect(eligibleCards(config)).toEqual([]);
          expect(eligibleCards({ ...config, privateSession: false })).toEqual(
            [],
          );
          expect(drawCard(config)).toEqual({ card: null, exhausted: true });
          const privatePool = eligibleCards({
            ...config,
            privateSession: true,
          });
          expect(privatePool).toHaveLength(6);
          expect(
            privatePool.every(
              (card) =>
                card.category === "flirty" &&
                card.language === language &&
                card.id.startsWith("flirty-v3-"),
            ),
          ).toBe(true);
        }
      }
    }
  });

  it("always excludes private cards from Random even when a private flag is supplied", () => {
    for (const privateSession of [undefined, false, true]) {
      for (const language of ["en", "tr"]) {
        for (const difficulty of ["easy", "medium", "bold"] as const) {
          for (const type of ["truth", "dare"] as const) {
            const pool = eligibleCards({
              ...options,
              mode: "random",
              language,
              difficulty,
              type,
              privateSession,
              unlockedPacks: ["core", "afterglow"],
            });
            expect(pool.length).toBeGreaterThan(0);
            expect(
              pool.every(
                (card) =>
                  card.category !== "flirty" &&
                  !card.id.startsWith("flirty-v3-"),
              ),
            ).toBe(true);
          }
        }
      }
    }
  });

  it("deals only the new private revision and respects its seen IDs across languages", () => {
    const seen = [...new Set(archivedFlirtyCards.map((card) => card.id))];
    const config = {
      ...options,
      mode: "flirty" as const,
      privateSession: true,
    };
    const pool = eligibleCards(config);
    for (let index = 0; index < pool.length; index++) {
      const result = drawCard(
        { ...config, language: index % 2 ? "tr" : "en", seen },
        () => 0,
      );
      expect(result.card).not.toBeNull();
      expect(result.card!.id).toMatch(/^flirty-v3-/);
      expect(seen).not.toContain(result.card!.id);
      seen.push(result.card!.id);
    }
    expect(drawCard({ ...config, seen }).exhausted).toBe(true);
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
      expect(
        dailyCard(
          "en",
          new Date(`2026-02-${String(day).padStart(2, "0")}T12:00:00Z`),
        ).id,
      ).toMatch(/-v2$/);
      expect(
        dailyCard(
          "tr",
          new Date(`2026-02-${String(day).padStart(2, "0")}T12:00:00Z`),
        ).language,
      ).toBe("tr");
    }
  });
});
