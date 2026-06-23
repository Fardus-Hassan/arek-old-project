export const SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "M/L",
  "S/M",
  "L/XL",
  "One Size",
] as const;

export const FABRIC_OPTIONS = [
  { label: "Bawełna", handle: "bawelna" },
  { label: "Wiskoza", handle: "wiskoza" },
  { label: "Poliester", handle: "polyester" },
  { label: "Wełna", handle: "wool" },
  { label: "Mesh", handle: "mesh" },
  { label: "Cotton", handle: "cotton" },
] as const;

export const COLOR_OPTIONS = [
  { label: "Szary", handle: "szary" },
  { label: "Czarny", handle: "czarny" },
  { label: "Granatowy", handle: "granatowy" },
  { label: "Biały", handle: "bialy" },
  { label: "Różowy", handle: "rozowy" },
  { label: "Czerwony", handle: "czerwony" },
  { label: "Niebieski", handle: "niebieski" },
  { label: "Zielony", handle: "zielony" },
  { label: "Beżowy", handle: "bezowy" },
  { label: "Kremowy", handle: "kremowy" },
] as const;

/** Shopify store accepts exactly these 4 values for Stan metafield. */
export const STAN_OPTIONS = [
  "Nowy",
  "Jak nowy",
  "Bardzo dobry",
  "Dobry",
] as const;

export type StanOption = (typeof STAN_OPTIONS)[number];

export const DEFAULT_STAN: StanOption = "Bardzo dobry";

const STAN_ALIASES: Record<string, StanOption> = {
  nowy: "Nowy",
  new: "Nowy",
  "jak nowy": "Jak nowy",
  "like new": "Jak nowy",
  likenew: "Jak nowy",
  "bardzo dobry": "Bardzo dobry",
  "very good": "Bardzo dobry",
  verygood: "Bardzo dobry",
  dobry: "Dobry",
  good: "Dobry",
  used: "Dobry",
  uzywany: "Dobry",
  uzwany: "Dobry",
};

function foldForStanMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Map AI/UI text to a Shopify-accepted Stan value, or "" if unmappable. */
export function normalizeStanValue(
  raw: string | undefined | null,
): StanOption | "" {
  if (raw == null) return "";
  const t = raw.trim();
  if (t === "" || t === "—") return "";

  for (const opt of STAN_OPTIONS) {
    if (foldForStanMatch(opt) === foldForStanMatch(t)) return opt;
  }

  const alias = STAN_ALIASES[foldForStanMatch(t)];
  return alias ?? "";
}

/** Stan for CSV export — never emits invalid values. */
export function stanForShopifyCsv(raw: string | undefined | null): StanOption {
  return normalizeStanValue(raw) || DEFAULT_STAN;
}

export const STATUS_OPTIONS = ["Active", "Draft", "Unlisted"] as const;

export const GENDER_OPTIONS = ["male", "female", "unisex"] as const;

export const GOOGLE_CONDITION_OPTIONS = ["new", "used"] as const;

export const DEFAULT_GOOGLE_CONDITION = "used" as const;

function foldGoogleCondition(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const GOOGLE_CONDITION_USED_ALIASES = new Set([
  "used",
  "uzywany",
  "uzyte",
  "secondhand",
  "second hand",
  "preowned",
  "pre-owned",
]);

export function normalizeGoogleCondition(
  raw: string | undefined | null,
): (typeof GOOGLE_CONDITION_OPTIONS)[number] {
  const t = foldGoogleCondition(String(raw ?? ""));
  if (!t || t === "—") return DEFAULT_GOOGLE_CONDITION;

  if (t === "new") return "new";
  if (t === "used" || GOOGLE_CONDITION_USED_ALIASES.has(t)) return "used";

  // Polish/AI labels like "Nowy" are not valid Google values — use client default.
  return DEFAULT_GOOGLE_CONDITION;
}

export function googleConditionForShopifyCsv(
  raw: string | undefined | null,
): string {
  return normalizeGoogleCondition(raw);
}

export const DEFAULT_SHOPIFY_PUBLISHED = true;
export const DEFAULT_SHOPIFY_STATUS = "Active";
export const DEFAULT_WEIGHT_GRAMS = "100";
export const DEFAULT_INVENTORY_QTY = "1";

/** Map placeholder sentinels to empty string for combobox display. */
export function displayFieldValue(raw: string | undefined | null): string {
  const t = String(raw ?? "").trim();
  if (!t || t === "—") return "";
  return t;
}

export const FABRIC_LABEL_OPTIONS = FABRIC_OPTIONS.map((f) => f.label);
export const COLOR_LABEL_OPTIONS = COLOR_OPTIONS.map((c) => c.label);
