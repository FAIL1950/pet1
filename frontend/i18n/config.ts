export const locales = ["ua", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ua";

export const LOCALE_COOKIE = "locale";

// `ua` is a country code, not a language — HTML `lang` and Intl formatting need the BCP 47 language tag.
export const LOCALE_TAGS = {
  ua: "uk",
  en: "en",
} as const satisfies Record<AppLocale, string>;

export type LocaleTag = (typeof LOCALE_TAGS)[AppLocale];

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function toLocaleTag(locale: AppLocale): LocaleTag {
  return LOCALE_TAGS[locale];
}

export function toAppLocale(tag: string): AppLocale {
  const language = tag.toLowerCase().split("-")[0];
  if (language === "uk" || language === "ua") return "ua";
  if (language === "en") return "en";
  return defaultLocale;
}

export function matchAcceptLanguage(header: string | null): AppLocale {
  if (!header) return defaultLocale;
  const languages = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter(({ tag, q }) => tag && q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of languages) {
    const language = tag.toLowerCase().split("-")[0];
    if (language === "uk") return "ua";
    if (language === "en") return "en";
  }
  return defaultLocale;
}
