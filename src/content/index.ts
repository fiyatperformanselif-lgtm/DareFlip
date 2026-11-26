import catalog from "./cards.json";
import archivedCatalog from "./archive-v1.json";
import archivedFlirtyCatalog from "./archive-v2-flirty.json";
import type { Card } from "../domain/types";

export const cards: readonly Card[] = catalog as Card[];
/** Previous revisions remain available only for exact saved-card restoration. */
export const archivedCards: readonly Card[] = archivedCatalog as Card[];
export const archivedFlirtyCards: readonly Card[] =
  archivedFlirtyCatalog as Card[];
export const persistedCards: readonly Card[] = [
  ...cards,
  ...archivedCards,
  ...archivedFlirtyCards,
];
const persistedLookup = new Map(
  persistedCards.map((card) => [`${card.id}:${card.language}`, card]),
);
export const contentLanguages = ["en", "tr"] as const;

/** UI must disclose fallback rather than presenting untranslated cards as localized. */
export function contentLanguage(requested: string): "en" | "tr" {
  return requested.toLowerCase().split(/[-_]/)[0] === "tr" ? "tr" : "en";
}

/** Never upgrades an archived favorite to a different editorial revision. */
export function lookupCard(
  id: string,
  language: string = "en",
): Card | undefined {
  return (
    persistedLookup.get(`${id}:${contentLanguage(language)}`) ??
    persistedLookup.get(`${id}:en`)
  );
}

export const contentStats = {
  targetOriginals: 5000,
  englishOriginals: cards.filter((card) => card.language === "en").length,
  turkishTranslations: cards.filter((card) => card.language === "tr").length,
  uniqueConcepts: new Set(cards.map((card) => card.id)).size,
};
