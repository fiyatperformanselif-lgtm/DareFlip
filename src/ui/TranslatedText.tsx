import { resolveTranslation } from "../i18n";
import type { Key, Locale, TranslationValues } from "../i18n";

interface TranslatedTextProps {
  locale: Locale;
  translationKey: Key;
  values?: TranslationValues;
}

/** Inline translated copy with actual-language metadata and isolated user values. */
export function TranslatedText({
  locale,
  translationKey,
  values = {},
}: TranslatedTextProps) {
  // Resolve without interpolation so values remain separate, escaped React nodes.
  const resolved = resolveTranslation(locale, translationKey);
  const parts = resolved.text.split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/g);
  return (
    <span
      lang={resolved.lang}
      dir={resolved.dir}
      data-translation-fallback={resolved.fallback ? "true" : undefined}
    >
      {parts.map((part, index) => {
        const placeholder = /^\{([a-zA-Z][a-zA-Z0-9]*)\}$/.exec(part);
        if (
          !placeholder ||
          !Object.prototype.hasOwnProperty.call(values, placeholder[1])
        )
          return part;
        return (
          <bdi key={`${index}:${placeholder[1]}`} dir="auto">
            {values[placeholder[1]]}
          </bdi>
        );
      })}
    </span>
  );
}
