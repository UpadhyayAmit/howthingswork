import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "ja", "zh", "de", "hi", "hin"],
  defaultLocale: "en",
  localePrefix: "as-needed", // /en paths are clean (no prefix for default)
});

export type Locale = (typeof routing.locales)[number];

export const localeLabels: Record<string, string> = {
  en: "English",
  fr: "Français",
  ja: "日本語",
  zh: "中文",
  de: "Deutsch",
  hi: "हिन्दी",
  hin: "Hinglish",
};

export const localeFlags: Record<string, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  ja: "🇯🇵",
  zh: "🇨🇳",
  de: "🇩🇪",
  hi: "🇮🇳",
  hin: "🇮🇳",
};
