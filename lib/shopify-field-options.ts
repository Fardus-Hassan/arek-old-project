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
  "Wiskoza",
  "Poliester",
  "Bawełna",
  "Len",
  "Jedwab",
  "Wełna",
  "Mieszanka",
  "Inne",
] as const;

export const STAN_OPTIONS = [
  "Nowy",
  "Jak nowy",
  "Bardzo dobry",
  "Dobry",
  "Używany",
] as const;

export const STATUS_OPTIONS = ["Active", "Draft", "Unlisted"] as const;

export const GENDER_OPTIONS = ["male", "female", "unisex"] as const;

export const GOOGLE_CONDITION_OPTIONS = ["new", "used"] as const;

export const DEFAULT_SHOPIFY_PUBLISHED = true;
export const DEFAULT_SHOPIFY_STATUS = "Active";
export const DEFAULT_WEIGHT_GRAMS = "100";
export const DEFAULT_INVENTORY_QTY = "1";
