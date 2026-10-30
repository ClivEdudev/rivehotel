import { en } from "./en.ts";
import { ru } from "./ru.ts";
import { uz } from "./uz.ts";
import type { Dictionary } from "./types.ts";

export const languages = ["uz", "ru", "en"] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = "uz";

export const dictionaries: Record<Lang, Dictionary> = { uz, ru, en };

export const langMeta: Record<Lang, { name: string; htmlLang: string; ogLocale: string }> = {
  uz: { name: "O'zbekcha", htmlLang: "uz", ogLocale: "uz_UZ" },
  ru: { name: "Русский", htmlLang: "ru", ogLocale: "ru_RU" },
  en: { name: "English", htmlLang: "en", ogLocale: "en_US" },
};

/** Language-specific URL, e.g. localizedPath("ru", "#rooms") -> "/ru/#rooms" */
export const localizedPath = (lang: Lang, hash = ""): string => `/${lang}/${hash}`;
