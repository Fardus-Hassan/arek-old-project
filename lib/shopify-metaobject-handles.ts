/**
 * Shopify list.metaobject_reference columns need metaobject handles in CSV,
 * not Polish display labels. Maps UI/AI labels → store handles at export time.
 */

/** Handles that exist in the client's Shopify store (fabrics). */
export const SHOPIFY_FABRIC_HANDLES = [
  "bawelna",
  "wiskoza",
  "polyester",
  "wool",
  "mesh",
  "cotton",
] as const;

function foldKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const FABRIC_LABEL_TO_HANDLE: Record<string, string> = {
  bawelna: "bawelna",
  bawełna: "bawelna",
  bałna: "bawelna",
  cotton: "cotton",
  wiskoza: "wiskoza",
  viscose: "wiskoza",
  poliester: "polyester",
  polyester: "polyester",
  welna: "wool",
  wełna: "wool",
  wool: "wool",
  mesh: "mesh",
  jedwab: "mesh",
  silk: "mesh",
  len: "cotton",
  linen: "cotton",
  mieszanka: "polyester",
  blend: "polyester",
  inne: "",
};

/** Common color labels → store handles (extend as client confirms). */
const COLOR_LABEL_TO_HANDLE: Record<string, string> = {
  szary: "szary",
  grey: "szary",
  gray: "szary",
  czarny: "czarny",
  black: "czarny",
  granatowy: "granatowy",
  navy: "granatowy",
  bialy: "bialy",
  biały: "bialy",
  white: "bialy",
  biale: "bialy",
  białe: "bialy",
  czerwony: "czerwony",
  red: "czerwony",
  niebieski: "niebieski",
  blue: "niebieski",
  rozowy: "rozowy",
  różowy: "rozowy",
  pink: "rozowy",
  zielony: "zielony",
  green: "zielony",
  bezowy: "bezowy",
  beige: "bezowy",
  kremowy: "kremowy",
  cream: "kremowy",
  zolty: "zolty",
  żółty: "zolty",
  yellow: "zolty",
  zloty: "zloty",
  złoty: "zloty",
  gold: "zloty",
  fioletowy: "fioletowy",
  purple: "fioletowy",
  bordowy: "bordowy",
  burgundy: "bordowy",
  braun: "braun",
  brown: "braun",
  brązowy: "braun",
};

const KNOWN_FABRIC_HANDLES = new Set<string>(SHOPIFY_FABRIC_HANDLES);

function lookupHandle(
  raw: string,
  dictionary: Record<string, string>,
  knownHandles?: Set<string>,
): string {
  const t = raw.trim();
  if (!t || t === "—") return "";

  const key = foldKey(t);
  if (dictionary[key]) return dictionary[key];
  if (knownHandles?.has(key)) return key;

  return "";
}

/** Single fabric label → metaobject handle for CSV (empty if unknown). */
export function toFabricMetaobjectHandle(raw: string): string {
  return lookupHandle(raw, FABRIC_LABEL_TO_HANDLE, KNOWN_FABRIC_HANDLES);
}

/** Single color label → metaobject handle for CSV (empty if unknown). */
export function toColorMetaobjectHandle(raw: string): string {
  return lookupHandle(raw, COLOR_LABEL_TO_HANDLE);
}

/**
 * List metaobject field — comma-separated handles, e.g. `bawelna,polyester`.
 * Input may be comma-separated Polish labels.
 */
export function toMetaobjectHandleList(
  raw: string,
  mapper: (part: string) => string,
): string {
  return raw
    .split(",")
    .map((part) => mapper(part.trim()))
    .filter(Boolean)
    .join(",");
}
