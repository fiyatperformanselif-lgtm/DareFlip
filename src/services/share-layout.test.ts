import { describe, expect, it } from "vitest";
import { fitText, graphemes, textDirection, wrapText } from "./share-layout";

const measure = (text: string, fontSize: number) => ({
  width: graphemes(text).length * fontSize * 0.5,
  ascent: fontSize * 0.8,
  descent: fontSize * 0.2,
});

describe("share-card typography layout", () => {
  it("wraps at words instead of splitting ordinary English/Turkish words", () => {
    expect(
      wrapText(
        "One short sentence should stay readable",
        12,
        (text) => text.length,
      ),
    ).toEqual(["One short", "sentence", "should stay", "readable"]);
    expect(
      wrapText("Birlikte anlamlı sohbetler", 17, (text) => text.length),
    ).toEqual(["Birlikte anlamlı", "sohbetler"]);
  });
  it("preserves explicit newlines and blank lines, including Windows line endings", () => {
    expect(
      wrapText("First line\n\nSecond line\r\nThird", 30, (text) => text.length),
    ).toEqual(["First line", "", "Second line", "Third"]);
  });
  it("uses complete graphemes for CJK and emoji when a token needs splitting", () => {
    const text = "👩🏽‍💻👨‍👩‍👧‍👦🇹🇷e\u0301";
    const lines = wrapText(text, 40, (value) => graphemes(value).length * 20);
    expect(lines).toEqual(["👩🏽‍💻👨‍👩‍👧‍👦", "🇹🇷e\u0301"]);
    const cjk = "你好世界，今天一起聊天吧！";
    const cjkLines = wrapText(cjk, 30, (value) => graphemes(value).length * 10);
    expect(cjkLines.join("")).toBe(cjk);
    expect(cjkLines.every((line) => graphemes(line).length <= 3)).toBe(true);
    expect(cjkLines.every((line) => !/^[，！]/u.test(line))).toBe(true);
  });
  it("protects emoji, accents, flag pairs and common conjuncts without Intl.Segmenter", () => {
    expect(graphemes("👩🏽‍💻👨‍👩‍👧‍👦🇹🇷e\u0301", false)).toEqual([
      "👩🏽‍💻",
      "👨‍👩‍👧‍👦",
      "🇹🇷",
      "e\u0301",
    ]);
    expect(graphemes("क्ष", false)).toEqual(["क्ष"]);
    expect(graphemes("1️⃣", false)).toEqual(["1️⃣"]);
    expect(graphemes("\u1100\u1161\u11a8\u1102\u1161", false)).toEqual([
      "\u1100\u1161\u11a8",
      "\u1102\u1161",
    ]);
  });
  it("uses the first strong letter for Arabic/Hebrew bidi fallback", () => {
    expect(textDirection("123 — مرحبًا بالعالم")).toBe("rtl");
    expect(textDirection("שלום")).toBe("rtl");
    expect(textDirection("DareFlip مرحبا")).toBe("ltr");
    expect(textDirection("İyi akşamlar")).toBe("ltr");
    expect(textDirection("e\u064e")).toBe("ltr");
  });
  it("reflows a long prompt at its fitted font size and keeps every ink bound inside the box", () => {
    const text = "A meaningful conversation leaves room for different answers. "
      .repeat(17)
      .trim();
    const box = { width: 792, height: 585 };
    const fitted = fitText(text, box, measure);
    expect(fitted.fontSize).toBeLessThan(88);
    expect(fitted.fontSize).toBeGreaterThanOrEqual(18);
    expect(fitted.lines.map((line) => line.text).join(" ")).toBe(text);
    for (const line of fitted.lines) {
      expect(line.width).toBeLessThanOrEqual(box.width);
      expect(line.baseline - line.ascent).toBeGreaterThanOrEqual(0);
      expect(line.baseline + line.descent).toBeLessThanOrEqual(box.height);
    }
  });
  it("uses the largest available type for a short prompt and retains blank lines after fitting", () => {
    expect(
      fitText("Hello", { width: 792, height: 585 }, measure).fontSize,
    ).toBe(88);
    expect(
      fitText("First\n\nLast", { width: 792, height: 585 }, measure).lines.map(
        (line) => line.text,
      ),
    ).toEqual(["First", "", "Last"]);
  });
  it("rejects impossible or invalid exports rather than clipping, truncating or looping", () => {
    expect(() =>
      fitText("Visible text", { width: 100, height: 1 }, measure),
    ).toThrow(/without clipping/);
    expect(() => fitText("Text", { width: 0, height: 100 }, measure)).toThrow(
      /Invalid/,
    );
    expect(() =>
      fitText(
        "Text",
        { width: 100, height: 100, maxFontSize: Infinity },
        measure,
      ),
    ).toThrow(/Invalid/);
    expect(() =>
      fitText("Text", { width: 100, height: 100 }, () => ({ width: NaN })),
    ).toThrow(/measurement/);
  });
});
