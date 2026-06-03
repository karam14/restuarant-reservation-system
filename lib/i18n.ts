import nl from "@/messages/nl.json";
import en from "@/messages/en.json";

const messages: Record<string, typeof nl> = { nl, en };

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof nl>;

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? path;
}

export function createTranslator(locale: string = "nl") {
  const dict = messages[locale] || messages.nl;

  return function t(key: string): string {
    return getNestedValue(dict, key);
  };
}

export function getLocale(tenantSettings?: Record<string, any>): string {
  return tenantSettings?.locale || "nl";
}
