export type Mode = "couples" | "party" | "flirty" | "deep" | "crazy" | "random";
export type Category = Exclude<Mode, "random">;
export type Difficulty = "easy" | "medium" | "bold";
export type Kind = "truth" | "dare";
export type Pack = "core" | "afterglow";

export interface Card {
  /** Stable concept ID. Translations share the same ID; id + language is unique. */
  id: string;
  category: Category;
  difficulty: Difficulty;
  type: Kind;
  language: string;
  text: string;
  pack: Pack;
  sensitive: boolean;
}

export interface DrawOptions {
  mode: Mode;
  difficulty: Difficulty;
  type: Kind;
  language: string;
  seen: readonly string[];
  unlockedPacks?: readonly Pack[];
}
