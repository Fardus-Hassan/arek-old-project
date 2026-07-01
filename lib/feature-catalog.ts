import type { FeatureRecord } from "@/lib/api/featureApi";
import {
  COLOR_LABEL_OPTIONS,
  FABRIC_LABEL_OPTIONS,
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  STAN_OPTIONS,
} from "@/lib/shopify-field-options";

export type OutputLanguage = "English" | "Polish";

export const GENERATION_LANGUAGE_KEY = "generationLanguage";

export type CatalogFieldKey =
  | "size"
  | "category"
  | "brand"
  | "fabric"
  | "gender"
  | "color"
  | "condition"
  | "feature";

export type CatalogOptions = Record<CatalogFieldKey, readonly string[]>;

const FALLBACK_GENDER_ENGLISH = ["Men", "Women", "Unisex"];
const FALLBACK_GENDER_POLISH = ["Mężczyźni", "Kobiety", "Unisex"];

function nonEmptyStrings(values: string[] | undefined): string[] {
  if (!values?.length) return [];
  return values.map((v) => v.trim()).filter(Boolean);
}

function withFallback(
  primary: string[] | undefined,
  fallback: readonly string[],
): readonly string[] {
  const cleaned = nonEmptyStrings(primary);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function getCatalogOptions(
  record: FeatureRecord | undefined,
  lang: OutputLanguage,
): CatalogOptions {
  const isPolish = lang === "Polish";

  return {
    size: withFallback(record?.size, SIZE_OPTIONS),
    category: withFallback(
      isPolish ? record?.categoryPolish : record?.categoryEnglish,
      [],
    ),
    brand: withFallback(
      isPolish ? record?.vendorPolish : record?.vendorsEnglish,
      [],
    ),
    fabric: withFallback(
      isPolish ? record?.fabricPolish : record?.fabricEnglish,
      FABRIC_LABEL_OPTIONS,
    ),
    gender: withFallback(
      isPolish ? record?.genderPolish : record?.genderEnglish,
      isPolish ? FALLBACK_GENDER_POLISH : FALLBACK_GENDER_ENGLISH,
    ),
    color: withFallback(
      isPolish ? record?.colorsPolish : record?.colorsEnglish,
      COLOR_LABEL_OPTIONS,
    ),
    condition: withFallback(
      isPolish ? record?.conditionPolish : record?.conditionEnglish,
      STAN_OPTIONS,
    ),
    feature: withFallback(
      isPolish ? record?.featurePolish : record?.featureEnglish,
      [],
    ),
  };
}

export function readGenerationLanguage(): OutputLanguage {
  if (typeof window === "undefined") return "Polish";
  const raw = sessionStorage.getItem(GENERATION_LANGUAGE_KEY);
  return raw === "English" ? "English" : "Polish";
}

export function persistGenerationLanguage(lang: OutputLanguage): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GENERATION_LANGUAGE_KEY, lang);
  } catch {
    // ignore
  }
}

/** Display gender label from AI or admin catalog values. */
export function displayGenderLabel(value: string | undefined | null): string {
  const t = String(value ?? "").trim();
  if (!t || t === "—") return "";

  const fold = t.toLowerCase();
  if (fold === "male" || fold === "men" || fold === "man") return t;
  if (fold === "female" || fold === "women" || fold === "woman") return t;
  if (fold === "unisex") return t;

  for (const opt of GENDER_OPTIONS) {
    if (opt.toLowerCase() === fold) return t;
  }

  return t;
}
