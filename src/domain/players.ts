/** Every choice is explicit. Names are never used to infer gender. */
export const GENDERS = ["female", "male", "nonbinary", "undisclosed"] as const;
export type Gender = (typeof GENDERS)[number];

export function isGender(value: unknown): value is Gender {
  return (
    typeof value === "string" && GENDERS.some((gender) => gender === value)
  );
}

/** Null preserves an unanswered legacy choice; it does not mean undisclosed. */
export function validGenders(
  value: unknown,
  playerCount: number,
): value is (Gender | null)[] {
  return (
    Number.isInteger(playerCount) &&
    playerCount >= 2 &&
    playerCount <= 20 &&
    Array.isArray(value) &&
    value.length === playerCount &&
    Array.from(value).every((gender) => gender === null || isGender(gender))
  );
}

/** An explicit preference not to disclose is complete; an unanswered choice is not. */
export function hasCompleteGenders(
  genders: readonly unknown[],
): genders is Gender[] {
  return validGenders(genders, genders.length) && genders.every(isGender);
}
