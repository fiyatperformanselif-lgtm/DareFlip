import { describe, expect, it } from "vitest";
import { GENDERS, hasCompleteGenders, isGender, validGenders } from "./players";

describe("explicit player gender choices", () => {
  it("accepts all four choices, including an explicit preference not to disclose", () => {
    for (const gender of GENDERS) expect(isGender(gender)).toBe(true);
    expect(hasCompleteGenders(["undisclosed", "nonbinary"])).toBe(true);
    expect(hasCompleteGenders(["female", "male"])).toBe(true);
  });

  it("keeps an unanswered legacy choice separate from undisclosed", () => {
    expect(validGenders([null, "undisclosed"], 2)).toBe(true);
    expect(hasCompleteGenders([null, "undisclosed"])).toBe(false);
    expect(isGender(null)).toBe(false);
  });

  it("rejects missing, unknown, sparse, misaligned or unbounded choices", () => {
    for (const value of [
      undefined,
      null,
      {},
      "female",
      [],
      ["female"],
      ["female", "unknown"],
      ["male", undefined],
      Array(2),
    ]) {
      expect(validGenders(value, 2)).toBe(false);
    }
    for (const value of ["Female", "woman", "other", "", 1, false]) {
      expect(isGender(value)).toBe(false);
    }
    expect(validGenders(["female", "male"], 3)).toBe(false);
    expect(validGenders(["female", "male"], 2.5)).toBe(false);
    expect(validGenders(["female"], 1)).toBe(false);
    expect(validGenders(Array(21).fill("undisclosed"), 21)).toBe(false);
    expect(hasCompleteGenders([])).toBe(false);
    expect(hasCompleteGenders(["female"])).toBe(false);
    expect(hasCompleteGenders(["female", "invalid"])).toBe(false);
  });

  it("supports every player in a 20-person session", () => {
    const choices = Array(20).fill("undisclosed");
    expect(validGenders(choices, 20)).toBe(true);
    expect(hasCompleteGenders(choices)).toBe(true);
  });
});
