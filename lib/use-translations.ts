"use client";

import { useMemo } from "react";
import { useTenant } from "@/lib/tenant-context";
import { createTranslator } from "@/lib/i18n";

export function useTranslations() {
  const { tenant } = useTenant();
  const locale = tenant?.settings?.locale || "nl";

  const t = useMemo(() => createTranslator(locale), [locale]);

  return { t, locale };
}
