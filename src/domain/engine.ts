import { cards, contentLanguage } from "../content";
import type { Card, DrawOptions } from "./types";

function randomIndex(length: number, rng: () => number): number {
  const value = rng();
  // An injected random source must obey Math.random's [0, 1) contract.
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random source must return a number in [0, 1).");
  }
  return Math.floor(value * length);
}

export function eligibleCards(options: DrawOptions): Card[] {
  const language = contentLanguage(options.language);
  const packs = options.unlockedPacks ?? ["core"];
  return cards
    .filter(
      (card) =>
        card.language === "en" &&
        (options.mode === "random" || card.category === options.mode) &&
        card.difficulty === options.difficulty &&
        card.type === options.type &&
        packs.includes(card.pack),
    )
    .map(
      (card) =>
        cards.find(
          (translated) =>
            translated.id === card.id && translated.language === language,
        ) ?? card,
    );
}

/** Does not silently recycle. Caller explicitly clears seen IDs to start a new deck. */
export function drawCard(
  options: DrawOptions,
  rng: () => number = Math.random,
): {
  card: Card | null;
  exhausted: boolean;
} {
  const seen = new Set(options.seen);
  const available = eligibleCards(options).filter((card) => !seen.has(card.id));
  if (!available.length) return { card: null, exhausted: true };
  return {
    card: available[randomIndex(available.length, rng)],
    exhausted: false,
  };
}

/** Selects fairly among all players except the previous one when possible. */
export function pickPlayer<T>(
  players: readonly T[],
  previous?: T,
  rng: () => number = Math.random,
): T | null {
  if (!players.length) return null;
  const available =
    players.length > 1
      ? players.filter((player) => player !== previous)
      : [...players];
  const pool = available.length ? available : [...players];
  return pool[randomIndex(pool.length, rng)];
}

/** The same canonical card is shown worldwide throughout a UTC date. */
export function dailyCard(language: string, date: Date = new Date()): Card {
  const available = cards.filter(
    (card) =>
      card.language === "en" &&
      card.pack === "core" &&
      card.type === "truth" &&
      !card.sensitive,
  );
  const day = date.toISOString().slice(0, 10);
  let hash = 2166136261;
  for (const char of day)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const selected = available[hash % available.length];
  return (
    cards.find(
      (card) =>
        card.id === selected.id && card.language === contentLanguage(language),
    ) ?? selected
  );
}
