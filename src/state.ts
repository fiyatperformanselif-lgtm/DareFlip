import { cards } from "./content";
import type { Card, Difficulty, Mode } from "./domain/types";
import { detectLanguage, languages } from "./i18n";
import type { Locale } from "./i18n";

export interface Session {
  players: string[];
  mode: Mode;
  difficulty: Difficulty;
  seen: string[];
  player: string;
  card: Card | null;
  rounds: number;
}
export interface State {
  version: 1;
  locale: Locale;
  sound: boolean;
  haptics: boolean;
  favorites: string[];
  session: Session | null;
  unlocked: boolean;
  ageConfirmed: boolean;
}

const knownIds = new Set(cards.map(({ id }) => id));
const canonicalCards = new Map(
  cards.map((card) => [`${card.id}:${card.language}`, card]),
);
const cardFields: readonly (keyof Card)[] = [
  "id",
  "category",
  "difficulty",
  "type",
  "language",
  "text",
  "pack",
  "sensitive",
];
const modes: readonly string[] = [
  "couples",
  "party",
  "flirty",
  "deep",
  "crazy",
  "random",
];
const difficulties: readonly string[] = ["easy", "medium", "bold"];

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= knownIds.size &&
    value.every((id) => typeof id === "string" && knownIds.has(id)) &&
    new Set(value).size === value.length
  );
}

function validCard(value: unknown): value is Card {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.language !== "string"
  )
    return false;
  const canonical = canonicalCards.get(`${value.id}:${value.language}`);
  return (
    canonical !== undefined &&
    cardFields.every((field) => value[field] === canonical[field])
  );
}

export function initialState(): State {
  return {
    version: 1,
    locale: detectLanguage(),
    sound: true,
    haptics: true,
    favorites: [],
    session: null,
    unlocked: false,
    ageConfirmed: false,
  };
}

/** Treat persisted data as untrusted; invalid payloads are handled by loadState's fallback. */
export function validState(value: unknown): value is State {
  if (!isRecord(value)) return false;
  if (
    value.version !== 1 ||
    !languages.some(({ code }) => code === value.locale) ||
    typeof value.sound !== "boolean" ||
    typeof value.haptics !== "boolean" ||
    typeof value.unlocked !== "boolean" ||
    typeof value.ageConfirmed !== "boolean" ||
    !validIds(value.favorites)
  )
    return false;

  if (value.session === null) return true;
  const session = value.session;
  if (
    !isRecord(session) ||
    !Array.isArray(session.players) ||
    session.players.length < 2 ||
    session.players.length > 20 ||
    !session.players.every(
      (player) =>
        typeof player === "string" &&
        player.length > 0 &&
        player.length <= 24 &&
        player === player.trim(),
    ) ||
    new Set(session.players.map((player: string) => player.toLocaleLowerCase()))
      .size !== session.players.length ||
    typeof session.mode !== "string" ||
    !modes.includes(session.mode) ||
    typeof session.difficulty !== "string" ||
    !difficulties.includes(session.difficulty) ||
    !validIds(session.seen) ||
    typeof session.player !== "string" ||
    !session.players.includes(session.player) ||
    typeof session.rounds !== "number" ||
    !Number.isSafeInteger(session.rounds) ||
    session.rounds < session.seen.length
  )
    return false;

  if (
    (session.mode === "flirty" || session.mode === "random") &&
    !value.ageConfirmed
  )
    return false;
  if (session.card === null) return true;
  if (!validCard(session.card)) return false;

  return (
    session.seen.includes(session.card.id) &&
    session.card.difficulty === session.difficulty &&
    (session.mode === "random" || session.card.category === session.mode) &&
    (session.card.pack === "core" || value.unlocked)
  );
}
