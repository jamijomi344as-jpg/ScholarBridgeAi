export const locales = ["en", "uz", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "scholarbridge_locale";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  uz: "O'zbekcha",
  ru: "Русский",
};

/** Human-readable language name used to instruct the AI model. */
export function localeToLanguageName(locale: string): string {
  switch (locale) {
    case "uz":
      return "Uzbek (O'zbek tili)";
    case "ru":
      return "Russian (Русский)";
    default:
      return "English";
  }
}
