import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  // Deep-merge with English fallback so missing translations show English
  // instead of throwing MISSING_MESSAGE errors
  const fallback =
    locale !== "en"
      ? (await import("../../messages/en.json")).default
      : undefined;

  // Escape literal { } in string values so next-intl doesn't try to
  // parse them as ICU message-format variables (e.g. "{ current }" or
  // "useEffect(() => {})").  Single-quote wrapping is the ICU escape.
  function escapeIcu(value: unknown): unknown {
    if (typeof value === "string") {
      // Replace { and } with their ICU-escaped equivalents only when they
      // appear as literal text (not already escaped).
      return value.replace(/\{/g, "'{'" ).replace(/\}/g, "'}'" );
    }
    if (Array.isArray(value)) return value.map(escapeIcu);
    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>)) {
        result[k] = escapeIcu((value as Record<string, unknown>)[k]);
      }
      return result;
    }
    return value;
  }

  function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...source };
    for (const key of Object.keys(target)) {
      if (
        target[key] !== null &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key]) &&
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        result[key] = target[key];
      }
    }
    return result;
  }

  const merged = fallback
    ? deepMerge(messages as Record<string, unknown>, fallback as Record<string, unknown>)
    : (messages as Record<string, unknown>);

  return {
    locale,
    messages: escapeIcu(merged) as Record<string, unknown>,
  };
});
