import { describe, expect, it } from "vitest";
import { cards } from "./content";
import { loadState, saveState, STORAGE_KEY } from "./domain/storage";
import type { StorageLike } from "./domain/storage";
import { initialState, loadAppState, validState } from "./state";
import { hasCompleteGenders } from "./domain/players";
import type { Session, State } from "./state";

const core = cards.find(
  (card) =>
    card.language === "en" && card.category === "party" && card.pack === "core",
)!;
const bonus = cards.find(
  (card) => card.language === "en" && card.pack === "afterglow",
)!;

function session(overrides: Partial<Session> = {}): Session {
  const players = overrides.players ?? ["Deniz", "Alex"];
  return {
    players,
    genders: players.map(() => "undisclosed"),
    mode: "party",
    difficulty: core.difficulty,
    seen: [core.id],
    player: "Deniz",
    card: { ...core },
    rounds: 1,
    ...overrides,
  };
}
function state(overrides: Partial<State> = {}): State {
  return { ...initialState(), locale: "en", session: session(), ...overrides };
}
function withoutGenders(value: Session): Omit<Session, "genders"> {
  const copy: Partial<Session> = { ...value };
  delete copy.genders;
  return copy as Omit<Session, "genders">;
}
function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("persisted application state validation", () => {
  it("accepts pristine state and a legitimate in-progress session", () => {
    expect(validState(initialState())).toBe(true);
    expect(validState(state())).toBe(true);
  });

  it("rejects wrong versions, types, missing fields and unsupported locales", () => {
    for (const value of [
      null,
      [],
      "state",
      {},
      { ...state(), version: 2 },
      { ...state(), locale: "zz" },
      { ...state(), unlocked: "yes" },
      { ...state(), sound: 1 },
      { ...state(), ageConfirmed: undefined },
      { ...state(), session: undefined },
    ]) {
      expect(validState(value)).toBe(false);
    }
  });

  it("requires 2–20 unique trimmed names of at most 24 characters and a current player", () => {
    const invalidPlayers = [
      [],
      ["Alex"],
      Array.from({ length: 21 }, (_, i) => `Player ${i}`),
      ["Alex", "alex"],
      ["Alex", " Alex"],
      ["Alex", "   "],
      ["Alex", "a".repeat(25)],
      ["Alex", 4],
    ];
    for (const players of invalidPlayers) {
      expect(
        validState({ ...state(), session: { ...session(), players } }),
        JSON.stringify(players),
      ).toBe(false);
    }
    expect(validState(state({ session: session({ player: "Unknown" }) }))).toBe(
      false,
    );
    const players = Array.from({ length: 20 }, (_, i) => `Player ${i}`);
    expect(
      validState(state({ session: session({ players, player: players[0] }) })),
    ).toBe(true);
    expect(
      validState(
        state({
          session: session({
            players: ["a".repeat(24), "Alex"],
            player: "Alex",
          }),
        }),
      ),
    ).toBe(true);
  });

  it("accepts only bounded unique known canonical IDs in favorites and seen", () => {
    for (const ids of [
      [core.id, core.id],
      ["unknown"],
      [42],
      Array.from({ length: cards.length + 1 }, () => core.id),
    ]) {
      expect(validState({ ...state(), favorites: ids })).toBe(false);
      expect(
        validState({ ...state(), session: { ...session(), seen: ids } }),
      ).toBe(false);
    }
    expect(validState(state({ favorites: [core.id] }))).toBe(true);
  });

  it("rejects unknown or altered card fields rather than trusting saved text", () => {
    const changes = [
      { id: "unknown" },
      { category: "unknown" },
      { difficulty: "impossible" },
      { type: "unknown" },
      { language: "xx" },
      { text: "tampered prompt" },
      { pack: "unknown" },
      { sensitive: !core.sensitive },
    ];
    for (const change of changes) {
      expect(
        validState({
          ...state(),
          session: { ...session(), card: { ...core, ...change } },
        }),
        JSON.stringify(change),
      ).toBe(false);
    }
    expect(
      validState({
        ...state(),
        session: {
          ...session(),
          card: { id: core.id, text: core.text, type: core.type },
        },
      }),
    ).toBe(false);
  });

  it("checks card inclusion in seen, difficulty, mode and pack entitlement", () => {
    expect(validState(state({ session: session({ seen: [] }) }))).toBe(false);
    expect(
      validState(
        state({
          session: session({
            difficulty: core.difficulty === "bold" ? "easy" : "bold",
          }),
        }),
      ),
    ).toBe(false);
    expect(validState(state({ session: session({ mode: "couples" }) }))).toBe(
      false,
    );
    const bonusSession = session({
      card: bonus,
      mode: bonus.category,
      difficulty: bonus.difficulty,
      seen: [bonus.id],
    });
    expect(validState(state({ session: bonusSession, unlocked: false }))).toBe(
      false,
    );
    expect(validState(state({ session: bonusSession, unlocked: true }))).toBe(
      true,
    );
  });

  it("requires confirmed adult participation in both Flirty and Random modes", () => {
    for (const mode of ["flirty", "random"] as const) {
      const current = session({ mode, card: null, seen: [], rounds: 0 });
      expect(validState(state({ session: current, ageConfirmed: false }))).toBe(
        false,
      );
      expect(validState(state({ session: current, ageConfirmed: true }))).toBe(
        true,
      );
    }
  });

  it("validates round counts while preserving explicit deck resets", () => {
    for (const rounds of [
      -1,
      0,
      1.5,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
    ]) {
      expect(validState(state({ session: session({ rounds }) }))).toBe(false);
    }
    expect(
      validState(
        state({ session: session({ rounds: 32, seen: [], card: null }) }),
      ),
    ).toBe(true);
    expect(validState(state({ session: session({ rounds: 32 }) }))).toBe(true);
  });

  it("preserves a valid prior card language after the interface language changes", () => {
    expect(validState(state({ locale: "tr" }))).toBe(true);
    expect(validState(state({ locale: "ar" }))).toBe(true);
    const translated = cards.find(
      (card) => card.id === core.id && card.language === "tr",
    );
    if (translated)
      expect(
        validState(
          state({ locale: "en", session: session({ card: translated }) }),
        ),
      ).toBe(true);
  });

  it("uses the fallback for malformed saved state without destroying it", () => {
    const storage = memoryStorage();
    const fallback = initialState();
    const tampered = {
      ...state(),
      session: { ...session(), card: { ...core, text: "changed" } },
    };
    expect(saveState(tampered, storage)).toBe(true);
    const before = storage.getItem(STORAGE_KEY);
    expect(loadState(fallback, validState, storage)).toBe(fallback);
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
    expect(saveState(state(), storage)).toBe(true);
    expect(loadState(fallback, validState, storage)).toEqual(state());
  });
});

describe("gender-aware application state and legacy migration", () => {
  it("requires gender metadata aligned to every player in current state", () => {
    const current = session();
    const missingGenders = withoutGenders(current);
    expect(validState({ ...state(), session: missingGenders })).toBe(false);
    for (const genders of [
      null,
      {},
      [],
      ["female"],
      ["female", "male", null],
      ["female", "invalid"],
      ["female", 0],
    ]) {
      expect(validState({ ...state(), session: { ...current, genders } })).toBe(
        false,
      );
    }
    expect(
      validState(
        state({ session: session({ genders: [null, "undisclosed"] }) }),
      ),
    ).toBe(true);
    expect(
      validState(
        state({ session: session({ genders: ["female", "nonbinary"] }) }),
      ),
    ).toBe(true);
  });

  it("roundtrips explicit choices and preserves their order alongside names", () => {
    const storage = memoryStorage();
    const original = state({
      session: session({ genders: ["male", "nonbinary"] }),
    });
    expect(saveState(original, storage)).toBe(true);
    const restored = loadAppState(storage);
    expect(restored).toEqual(original);
    expect(restored.session!.players).toEqual(["Deniz", "Alex"]);
    expect(restored.session!.genders).toEqual(["male", "nonbinary"]);
    expect(hasCompleteGenders(restored.session!.genders)).toBe(true);
  });

  it("migrates a legacy save without guessing gender or changing any progress", () => {
    const storage = memoryStorage();
    const legacySession = withoutGenders(session({ rounds: 42 }));
    const legacy = {
      ...state(),
      locale: "tr",
      sound: false,
      haptics: false,
      favorites: [core.id, bonus.id],
      unlocked: true,
      ageConfirmed: true,
      session: legacySession,
    };
    expect(saveState(legacy, storage)).toBe(true);
    const before = storage.getItem(STORAGE_KEY);
    const restored = loadAppState(storage);
    expect(restored).toEqual({
      ...legacy,
      session: { ...legacySession, genders: [null, null] },
    });
    expect(restored.session!.card).toEqual(core);
    expect(restored.session!.seen).toEqual([core.id]);
    expect(restored.session!.rounds).toBe(42);
    expect(hasCompleteGenders(restored.session!.genders)).toBe(false);
    // Loading is read-only; existing persisted data is not destroyed or replaced.
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("leaves all 20 legacy choices unanswered regardless of names", () => {
    const storage = memoryStorage();
    const names = [
      "Anna",
      "John",
      "Alex",
      "Deniz",
      ...Array.from({ length: 16 }, (_, index) => `Player ${index}`),
    ];
    const legacySession = withoutGenders(
      session({ players: names, player: names[0] }),
    );
    saveState({ ...state(), session: legacySession }, storage);
    const restored = loadAppState(storage);
    expect(restored.session!.players).toEqual(names);
    expect(restored.session!.genders).toEqual(Array(20).fill(null));
  });

  it("keeps a migrated pending session through a subsequent save and reload", () => {
    const storage = memoryStorage();
    const original = state({
      session: session({ genders: [null, "undisclosed"], rounds: 8 }),
    });
    saveState(original, storage);
    const restored = loadAppState(storage);
    expect(restored).toEqual(original);
    expect(hasCompleteGenders(restored.session!.genders)).toBe(false);
    const completed = {
      ...restored,
      session: { ...restored.session!, genders: ["female", "undisclosed"] },
    };
    saveState(completed, storage);
    expect(loadAppState(storage)).toEqual(completed);
    expect(hasCompleteGenders(loadAppState(storage).session!.genders)).toBe(
      true,
    );
  });

  it("never treats malformed gender metadata or a tampered legacy card as migratable", () => {
    const storage = memoryStorage();
    for (const genders of [
      null,
      [],
      ["female"],
      ["female", "unknown"],
      ["female", 1],
    ]) {
      const invalid = { ...state(), session: { ...session(), genders } };
      saveState(invalid, storage);
      expect(loadAppState(storage).session).toBeNull();
    }
    const legacySession = withoutGenders(session());
    saveState(
      {
        ...state(),
        session: { ...legacySession, card: { ...core, text: "tampered" } },
      },
      storage,
    );
    expect(loadAppState(storage).session).toBeNull();
    saveState({ ...state(), version: 2, session: legacySession }, storage);
    expect(loadAppState(storage).session).toBeNull();
  });

  it("falls back safely with unavailable or corrupt storage and leaves a no-session save intact", () => {
    const denied: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadAppState(denied).session).toBeNull();
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{");
    expect(loadAppState(storage).session).toBeNull();
    const pristine = state({ session: null, favorites: [core.id] });
    saveState(pristine, storage);
    expect(loadAppState(storage)).toEqual(pristine);
  });
});
