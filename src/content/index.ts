import catalog from "./cards.json";
import type { Card } from "../domain/types";

export const cards: readonly Card[] = catalog as Card[];
export const contentLanguages = ["en", "tr"] as const;

/** UI must disclose fallback rather than presenting untranslated cards as localized. */
export function contentLanguage(requested: string): "en" | "tr" {
  return requested.toLowerCase().split(/[-_]/)[0] === "tr" ? "tr" : "en";
}

export const contentStats = {
  targetOriginals: 5000,
  englishOriginals: cards.filter((card) => card.language === "en").length,
  turkishTranslations: cards.filter((card) => card.language === "tr").length,
  uniqueConcepts: new Set(cards.map((card) => card.id)).size,
};
