export interface TextMeasurement {
  /** Physical ink width, including any glyph overhang. */
  width: number;
  ascent?: number;
  descent?: number;
  /** Correction for asymmetrical ink when drawing with textAlign=center. */
  centerOffset?: number;
}
export type MeasureText = (text: string, fontSize: number) => TextMeasurement;
export interface TextBox {
  width: number;
  height: number;
  maxFontSize?: number;
  minFontSize?: number;
}
export interface FittedLine {
  text: string;
  width: number;
  baseline: number;
  ascent: number;
  descent: number;
  centerOffset: number;
}
export interface FittedText {
  fontSize: number;
  lineHeight: number;
  height: number;
  lines: FittedLine[];
}

const extend = /\p{Mark}|\u200c|[\ufe00-\ufe0f]/u;
const virama =
  /[\u094d\u09cd\u0a4d\u0acd\u0b4d\u0bcd\u0c4d\u0ccd\u0d4d\u0dca\u1039\u103a\u17d2]$/u;
const closingPunctuation = /^[、。，．！？：；）］｝〉》」』】〕…]/u;
function hangulClass(point: number): string {
  if (
    (point >= 0x1100 && point <= 0x115f) ||
    (point >= 0xa960 && point <= 0xa97c)
  )
    return "L";
  if (
    (point >= 0x1160 && point <= 0x11a7) ||
    (point >= 0xd7b0 && point <= 0xd7c6)
  )
    return "V";
  if (
    (point >= 0x11a8 && point <= 0x11ff) ||
    (point >= 0xd7cb && point <= 0xd7fb)
  )
    return "T";
  if (point >= 0xac00 && point <= 0xd7a3)
    return (point - 0xac00) % 28 === 0 ? "LV" : "LVT";
  return "";
}

/** Native Unicode segmentation first; fallback protects combining/emoji sequences. */
export function graphemes(text: string, useIntl = true): string[] {
  if (useIntl && typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (part) => part.segment,
    );
  }
  const parts: string[] = [];
  const regional = (point: number) => point >= 0x1f1e6 && point <= 0x1f1ff;
  for (const point of Array.from(text)) {
    const code = point.codePointAt(0)!;
    const previous = parts[parts.length - 1];
    const previousPoints = previous ? Array.from(previous) : [];
    const lastClass = hangulClass(previousPoints.at(-1)?.codePointAt(0) ?? 0);
    const nextClass = hangulClass(code);
    const joinedHangul =
      (lastClass === "L" && ["L", "V", "LV", "LVT"].includes(nextClass)) ||
      (["LV", "V"].includes(lastClass) && ["V", "T"].includes(nextClass)) ||
      (["LVT", "T"].includes(lastClass) && nextClass === "T");
    const pairRegional =
      regional(code) &&
      previousPoints.length === 1 &&
      regional(previousPoints[0].codePointAt(0)!);
    if (
      previous &&
      (extend.test(point) ||
        point === "\u200d" ||
        previous.endsWith("\u200d") ||
        virama.test(previous) ||
        (code >= 0x1f3fb && code <= 0x1f3ff) ||
        (code >= 0xe0020 && code <= 0xe007f) ||
        pairRegional ||
        joinedHangul ||
        (previous === "\r" && point === "\n"))
    )
      parts[parts.length - 1] += point;
    else parts.push(point);
  }
  return parts;
}

/** First strong letter decides bidi direction; do not reverse Arabic/Hebrew strings. */
export function textDirection(text: string): CanvasDirection {
  for (const point of Array.from(text)) {
    if (!/\p{Letter}/u.test(point)) continue;
    return /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/u.test(point)
      ? "rtl"
      : "ltr";
  }
  return "ltr";
}

function splitToken(
  token: string,
  maxWidth: number,
  width: (text: string) => number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const point of graphemes(token)) {
    if (line && width(line + point) > maxWidth) {
      // Keep CJK closing punctuation with a preceding glyph when possible.
      const previous = graphemes(line);
      if (closingPunctuation.test(point) && previous.length > 1) {
        const last = previous.pop()!;
        lines.push(previous.join(""));
        line = last + point;
      } else {
        lines.push(line);
        line = point;
      }
    } else line += point;
  }
  if (line) lines.push(line);
  return lines;
}

/** Spaces are wrapping opportunities; explicit newlines, including blanks, remain. */
export function wrapText(
  text: string,
  maxWidth: number,
  width: (text: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    const words = paragraph
      .trim()
      .split(/[^\S\n]+/u)
      .filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const joined = line ? `${line} ${word}` : word;
      if (width(joined) <= maxWidth) {
        line = joined;
        continue;
      }
      if (line) {
        lines.push(line);
      }
      if (width(word) <= maxWidth) line = word;
      else {
        const fragments = splitToken(word, maxWidth, width);
        lines.push(...fragments.slice(0, -1));
        line = fragments[fragments.length - 1] ?? "";
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Reflow at every measured size. Never crop, ellipsize or compress text horizontally. */
export function fitText(
  text: string,
  box: TextBox,
  measure: MeasureText,
): FittedText {
  if (
    !Number.isFinite(box.width) ||
    !Number.isFinite(box.height) ||
    box.width <= 0 ||
    box.height <= 0
  )
    throw new Error("Invalid share-card text area.");
  const minimum = Math.ceil(box.minFontSize ?? 18);
  const maximum = Math.floor(box.maxFontSize ?? 88);
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum <= 0 ||
    maximum < minimum
  )
    throw new Error("Invalid share-card font range.");
  const candidate = (fontSize: number): FittedText | null => {
    const cache = new Map<string, TextMeasurement>();
    const metrics = (value: string): TextMeasurement => {
      let result = cache.get(value);
      if (!result) {
        result = measure(value, fontSize);
        if (
          !Number.isFinite(result.width) ||
          result.width < 0 ||
          [result.ascent, result.descent, result.centerOffset].some(
            (value) => value !== undefined && !Number.isFinite(value),
          )
        )
          throw new Error("Text measurement failed.");
        cache.set(value, result);
      }
      return result;
    };
    const wrapped = wrapText(text, box.width, (value) => metrics(value).width);
    const measured = wrapped.map((value) => ({
      text: value,
      ...metrics(value),
    }));
    const ascent = Math.max(
      fontSize * 0.78,
      ...measured.map((line) => line.ascent ?? 0),
    );
    const descent = Math.max(
      fontSize * 0.22,
      ...measured.map((line) => line.descent ?? 0),
    );
    const lineHeight = Math.max(
      fontSize * 1.23,
      ascent + descent + fontSize * 0.1,
    );
    const height =
      ascent + descent + Math.max(0, measured.length - 1) * lineHeight;
    if (height > box.height || measured.some((line) => line.width > box.width))
      return null;
    const firstBaseline = (box.height - height) / 2 + ascent;
    return {
      fontSize,
      lineHeight,
      height,
      lines: measured.map((line, index) => ({
        text: line.text,
        width: line.width,
        baseline: firstBaseline + index * lineHeight,
        ascent: line.ascent ?? ascent,
        descent: line.descent ?? descent,
        centerOffset: line.centerOffset ?? 0,
      })),
    };
  };
  let lower = minimum;
  let upper = maximum;
  let best: FittedText | null = null;
  while (lower <= upper) {
    const font = Math.floor((lower + upper) / 2);
    const layout = candidate(font);
    if (layout) {
      best = layout;
      lower = font + 1;
    } else upper = font - 1;
  }
  if (!best)
    throw new Error("This text is too long to export without clipping.");
  return best;
}
