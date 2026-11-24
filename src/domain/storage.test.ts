import { describe, expect, it } from "vitest";
import {
  clearState,
  loadState,
  saveState,
  STORAGE_KEY,
  type StorageLike,
} from "./storage";

function memoryStorage(): StorageLike {
  const records = new Map<string, string>();
  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => {
      records.set(key, value);
    },
    removeItem: (key) => {
      records.delete(key);
    },
  };
}

describe("versioned local state", () => {
  it("round trips players, history and settings through the current envelope", () => {
    const storage = memoryStorage();
    const state = {
      players: ["Ada", "Lin"],
      seen: ["party-easy-truth-1"],
      settings: { sound: false },
      current: null,
    };
    expect(saveState(state, storage)).toBe(true);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
      version: 1,
      data: state,
    });
    expect(loadState({}, undefined, storage)).toEqual(state);
  });

  it("uses the fallback for empty, corrupt and incompatible records", () => {
    const storage = memoryStorage();
    const fallback = { players: [] };
    expect(loadState(fallback, undefined, storage)).toBe(fallback);
    for (const raw of [
      "{",
      "null",
      "[]",
      '{"data":{}}',
      '{"version":2,"data":{}}',
      '{"version":1,"data":null}',
      '{"version":1,"data":"state"}',
    ]) {
      storage.setItem(STORAGE_KEY, raw);
      expect(loadState(fallback, undefined, storage)).toBe(fallback);
    }
  });

  it("applies the application validator before returning persisted data", () => {
    const storage = memoryStorage();
    const fallback = { players: [] as string[] };
    saveState({ players: 42 }, storage);
    const validator = (value: unknown) =>
      Array.isArray((value as { players?: unknown }).players);
    expect(loadState(fallback, validator, storage)).toBe(fallback);
    saveState({ players: ["Ada", "Lin"] }, storage);
    expect(loadState(fallback, validator, storage).players).toEqual([
      "Ada",
      "Lin",
    ]);
    expect(
      loadState(
        fallback,
        () => {
          throw new Error("Invalid state");
        },
        storage,
      ),
    ).toBe(fallback);
  });

  it("rejects prototype pollution keys and non-JSON values", () => {
    const storage = memoryStorage();
    const fallback = {};
    storage.setItem(
      STORAGE_KEY,
      '{"version":1,"data":{"__proto__":{"polluted":true}}}',
    );
    expect(loadState(fallback, undefined, storage)).toBe(fallback);
    expect(saveState({ n: Number.NaN }, storage)).toBe(false);
    expect(saveState({ when: new Date() }, storage)).toBe(false);
    expect(saveState({ fn: () => 1 }, storage)).toBe(false);
    expect(saveState({ optional: undefined }, storage)).toBe(false);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(saveState(cyclic, storage)).toBe(false);
  });

  it("handles denied storage access and quota failures without interrupting play", () => {
    const denied: StorageLike = {
      getItem: () => {
        throw new Error("Denied");
      },
      setItem: () => {
        throw new Error("Quota");
      },
      removeItem: () => {
        throw new Error("Denied");
      },
    };
    const fallback = { players: [] };
    expect(loadState(fallback, undefined, denied)).toBe(fallback);
    expect(saveState({ players: ["Ada"] }, denied)).toBe(false);
    expect(clearState(denied)).toBe(false);
  });

  it("clears only its own key", () => {
    const storage = memoryStorage();
    storage.setItem("unrelated", "keep");
    saveState({ players: ["Ada"] }, storage);
    expect(clearState(storage)).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem("unrelated")).toBe("keep");
  });
});
