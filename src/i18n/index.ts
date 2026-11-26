import { en, type Key, type Dictionary } from "./en";
import { tr } from "./tr";
import { partial } from "./partial";

export type { Key, Dictionary } from "./en";
export type Locale =
  | "en"
  | "tr"
  | "de"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "nl"
  | "ru"
  | "ar"
  | "hi"
  | "ja"
  | "ko"
  | "zh"
  | "id"
  | "pl"
  | "sv"
  | "no"
  | "da"
  | "el";
export interface Language {
  code: Locale;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  /** Complete means every canonical interface key has a translation. */
  uiComplete: boolean;
  /** Availability of translations of the cards actually included, not the 5,000-card roadmap. */
  contentStatus: "available" | "partial" | "unavailable";
}
export const languages: readonly Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
    uiComplete: true,
    contentStatus: "available",
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    dir: "ltr",
    uiComplete: true,
    contentStatus: "available",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "zh",
    name: "Chinese Simplified",
    nativeName: "简体中文",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "pl",
    name: "Polish",
    nativeName: "Polski",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "sv",
    name: "Swedish",
    nativeName: "Svenska",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "no",
    name: "Norwegian",
    nativeName: "Norsk",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "da",
    name: "Danish",
    nativeName: "Dansk",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
  {
    code: "el",
    name: "Greek",
    nativeName: "Ελληνικά",
    dir: "ltr",
    uiComplete: false,
    contentStatus: "unavailable",
  },
];

export const dictionaries: Readonly<
  Record<Locale, Readonly<Partial<Dictionary>>>
> = { en, tr, ...partial };

export function normalizeLocale(value: string): Locale | null {
  const code = value.trim().toLowerCase().replace(/_/g, "-").split("-")[0];
  if (code === "nb" || code === "nn") return "no";
  if (code === "in") return "id";
  return languages.some((language) => language.code === code)
    ? (code as Locale)
    : null;
}

/** Passing preferred locales also makes server rendering and tests deterministic. */
export function detectLanguage(preferred?: readonly string[]): Locale {
  const candidates =
    preferred ??
    (typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language]);
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }
  return "en";
}

export function localeInfo(locale: string): Language {
  return (
    languages.find((item) => item.code === normalizeLocale(locale)) ??
    languages[0]
  );
}

export function hasTranslation(locale: Locale, key: Key): boolean {
  return Object.prototype.hasOwnProperty.call(dictionaries[locale], key);
}

export type TranslationValues = Readonly<Record<string, string | number>>;

export interface ResolvedTranslation {
  text: string;
  lang: Locale;
  dir: "ltr" | "rtl";
  fallback: boolean;
}

/** Report the language actually used, rather than inheriting the requested locale. */
export function resolveTranslation(
  locale: Locale,
  key: Key,
  vars: TranslationValues = {},
): ResolvedTranslation {
  const localized = dictionaries[locale]?.[key];
  const fallback = localized === undefined;
  const lang = fallback ? "en" : locale;
  const template = localized ?? en[key];
  const text = template.replace(
    /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
    (placeholder, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name)
        ? String(vars[name])
        : placeholder,
  );
  return { text, lang, dir: localeInfo(lang).dir, fallback };
}

/** Spread onto the element containing the translated text, including form controls. */
export function translationAttrs(
  locale: Locale,
  key: Key,
): Pick<ResolvedTranslation, "lang" | "dir"> {
  const { lang, dir } = resolveTranslation(locale, key);
  return { lang, dir };
}

/** Keep the original string API for attributes and callers that need plain text. */
export function t(
  locale: Locale,
  key: Key,
  vars: TranslationValues = {},
): string {
  return resolveTranslation(locale, key, vars).text;
}

export function translationProgress(locale: Locale): {
  translated: number;
  total: number;
} {
  return {
    translated: Object.keys(dictionaries[locale]).length,
    total: Object.keys(en).length,
  };
}
