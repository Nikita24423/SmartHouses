import { ru, type Dictionary } from "./locales/ru";
import { en } from "./locales/en";

export type Locale = "ru" | "en";

const dictionaries: Record<Locale, Dictionary> = { ru, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ru;
}

export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = getDictionary(locale);
  const parts = key.split(".");
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof value !== "string") return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export { ru, en };
export type { Dictionary };


