/** A deliberately small interface also usable in tests and non-browser hosts. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORAGE_KEY = "dareflip:v1";
const VERSION = 1;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Only JSON values are accepted; do not silently lose functions or NaN. */
function isSafeJson(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  )
    return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  ancestors.add(value);
  const safe = Object.keys(value).every(
    (key) =>
      !UNSAFE_KEYS.has(key) &&
      isSafeJson((value as Record<string, unknown>)[key], ancestors),
  );
  ancestors.delete(value);
  return safe;
}

function isState(value: unknown): value is object {
  return value !== null && typeof value === "object" && isSafeJson(value);
}

function availableStorage(storage?: StorageLike): StorageLike | undefined {
  return storage ?? globalThis.localStorage;
}

/** Returns false on quota errors, unavailable storage or non-JSON state. */
export function saveState<T>(state: T, storage?: StorageLike): boolean {
  try {
    if (!isState(state)) return false;
    const target = availableStorage(storage);
    if (!target) return false;
    target.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: VERSION, data: state }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Application callers should supply a shape validator when loading game state.
 * Invalid records are retained for possible recovery but never returned.
 */
export function loadState<T>(
  fallback: T,
  validate?: (value: unknown) => boolean,
  storage?: StorageLike,
): T {
  try {
    const raw = availableStorage(storage)?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return fallback;
    const envelope: unknown = JSON.parse(raw);
    if (!isState(envelope) || Array.isArray(envelope)) return fallback;
    const record = envelope as Record<string, unknown>;
    if (
      record.version !== VERSION ||
      !Object.hasOwn(record, "data") ||
      !isState(record.data)
    )
      return fallback;
    if (validate && !validate(record.data)) return fallback;
    return record.data as T;
  } catch {
    return fallback;
  }
}

/** Removes only DareFlip's state; never clears other applications' storage. */
export function clearState(storage?: StorageLike): boolean {
  try {
    const target = availableStorage(storage);
    if (!target) return false;
    target.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
