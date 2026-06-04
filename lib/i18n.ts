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

  function t(key: string, params?: Record<string, string | number>): string {
    let value = getNestedValue(dict, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return value;
  }

  return t;
}

export function getLocale(tenantSettings?: Record<string, any>): string {
  return tenantSettings?.locale || "nl";
}
