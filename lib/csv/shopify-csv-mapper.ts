import type { ProductListingData } from "@/lib/map-document-to-product-listing";
import {
  DEFAULT_INVENTORY_QTY,
  DEFAULT_WEIGHT_GRAMS,
  stanForShopifyCsv,
  googleConditionForShopifyCsv,
} from "@/lib/shopify-field-options";
import {
  toColorMetaobjectHandle,
  toFabricMetaobjectHandle,
  toMetaobjectHandleList,
} from "@/lib/shopify-metaobject-handles";
import type { ShopifyCsvColumn } from "./shopify-csv-columns";

function isPlaceholder(v: string | undefined | null): boolean {
  if (v == null) return true;
  const t = v.trim();
  return t === "" || t === "—";
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

/** Combine description and key features into one HTML block. */
export function buildDescriptionHtml(product: ProductListingData): string {
  const parts: string[] = [];

  const desc = product.description.trim();
  if (desc && !isPlaceholder(desc)) {
    parts.push(looksLikeHtml(desc) ? desc : `<p>${escapeHtmlText(desc)}</p>`);
  }

  if (product.keyFeatures.length > 0) {
    const items = product.keyFeatures
      .map((f) => `<li>${escapeHtmlText(f)}</li>`)
      .join("");
    parts.push(`<ul>${items}</ul>`);
  }

  return parts.join("\n").trim();
}

export function buildShopifyHandle(product: ProductListingData): string {
  const title = isPlaceholder(product.title) ? "product" : product.title.trim();
  const docId = (product.documentId ?? "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const uniq =
    docId.length >= 6
      ? docId.slice(-12)
      : `tab-${Math.random().toString(36).slice(2, 10)}`;

  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const base = slug || "product";
  const h = `${base}-${uniq}`.toLowerCase().replace(/-+/g, "-");
  return h.length > 255 ? h.slice(0, 255) : h;
}

function formatTags(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter((t) => t && t !== "—")
    .join(", ");
}

function emptyIfZeroNumeric(raw: string): string {
  const t = raw.trim();
  if (t === "") return "";
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n);
}

function extractNumericDim(value: string): string {
  if (isPlaceholder(value)) return "";
  const match = value.match(/[\d.]+/);
  if (!match) return "";
  return emptyIfZeroNumeric(match[0]);
}

function normalizePrice(price: string): string {
  const p = price.trim();
  if (!p) return "";
  const n = p.replace(/[^0-9.,-]/g, "").replace(",", ".");
  if (!n || Number.isNaN(Number(n))) return p;
  return emptyIfZeroNumeric(n);
}

function csvQuantity(value: string | undefined, fallback: string): string {
  const t = (value ?? "").trim();
  if (!t || t === "—") return emptyIfZeroNumeric(fallback);
  return emptyIfZeroNumeric(t);
}

function normalizeGender(gender: string): string {
  const g = gender.trim().toLowerCase();
  if (g === "male" || g === "female" || g === "unisex") return g;
  if (g === "men" || g === "man") return "male";
  if (g === "women" || g === "woman") return "female";
  return g;
}

export type ShopifyCsvBuildOpts = {
  sku: string;
  price: string;
  published: boolean;
  shopifyStatus: string;
};

export type ShopifyCsvRow = Partial<Record<ShopifyCsvColumn, string>>;

/** Build the primary product row with all field mappings. */
export function mapProductToPrimaryRow(
  product: ProductListingData,
  opts: ShopifyCsvBuildOpts,
): ShopifyCsvRow {
  const handle = buildShopifyHandle(product);
  const title = isPlaceholder(product.title) ? "Untitled product" : product.title.trim();
  const description = buildDescriptionHtml(product);
  const vendor = isPlaceholder(product.details.brand) ? "" : product.details.brand.trim();
  const category = isPlaceholder(product.details.category)
    ? ""
    : product.details.category.trim();
  const size = product.selectedSize.trim();
  const colorLabel = product.selectedColor.trim();
  const colorHandle = toMetaobjectHandleList(colorLabel, toColorMetaobjectHandle);
  const googleCondition = googleConditionForShopifyCsv(product.variants.condition);
  const feature = isPlaceholder(product.variants.feature)
    ? ""
    : product.variants.feature.trim();
  const fabricLabel = isPlaceholder(product.metafields.fabric)
    ? ""
    : product.metafields.fabric.trim();
  const fabricHandle = toMetaobjectHandleList(
    fabricLabel,
    toFabricMetaobjectHandle,
  );
  const stan = stanForShopifyCsv(product.productCondition);
  const productCode = isPlaceholder(product.metafields.productCode)
    ? ""
    : product.metafields.productCode.trim();

  const backOrDress =
    extractNumericDim(product.metafields.backLength) ||
    extractNumericDim(product.metafields.dressLength);

  const firstImage = product.images.find((img) => img.url?.trim());
  const imgUrl = firstImage?.url?.trim() ?? "";
  const imgAlt = firstImage?.label?.trim() ?? "";
  const weightGrams = csvQuantity(product.weightGrams, DEFAULT_WEIGHT_GRAMS);

  return {
    Title: title,
    "URL handle": handle,
    Description: description,
    Vendor: vendor,
    "Product category": category,
    Type: category,
    Tags: formatTags(product.tags),
    "Published on online store": opts.published ? "TRUE" : "FALSE",
    Status: opts.shopifyStatus || "Active",
    SKU: opts.sku.trim(),
    "Option1 name": size ? "Size" : "",
    "Option1 value": size,
    Price: normalizePrice(opts.price),
    "Charge tax": "TRUE",
    "Inventory tracker": "shopify",
    "Inventory quantity": csvQuantity(product.inventoryQty, DEFAULT_INVENTORY_QTY),
    "Continue selling when out of stock": "DENY",
    "Weight value (grams)": weightGrams,
    "Weight unit for display": weightGrams ? "g" : "",
    "Requires shipping": "TRUE",
    "Fulfillment service": "manual",
    "Product image URL": imgUrl,
    "Image position": imgUrl ? "1" : "",
    "Image alt text": imgAlt,
    "Gift card": "FALSE",
    "Color (product.metafields.shopify.color-pattern)": colorHandle,
    "Google Shopping / Gender": normalizeGender(product.details.gender),
    "Google Shopping / Condition": googleCondition,
    "Rozmiar (product.metafields.custom.rozmiar)": size,
    "Producent (product.metafields.custom.producent)": vendor,
    "Stan (product.metafields.custom.stan)": stan,
    "Kod produktu: (product.metafields.custom.kod_produktu_)": productCode,
    "Skład (product.metafields.custom.sk_ad)": fabricLabel,
    "Szerokość od pachy do pachy (product.metafields.custom.szeroko_od_pachy_do_pachy_)":
      extractNumericDim(product.metafields.chestWidth),
    "Długość tył (product.metafields.custom.d_ugo_ty_)": backOrDress,
    "Szerokość Talia (product.metafields.custom.szeroko_talia)":
      extractNumericDim(product.metafields.waistWidth),
    "Długość rękawa (product.metafields.custom.d_ugo_r_kawa)":
      extractNumericDim(product.metafields.sleeveLength),
    "Rozmiar pod biustem (product.metafields.custom.underbust)":
      extractNumericDim(product.metafields.underBust),
    "Wzór (product.metafields.custom.wz_r)": feature,
    "Fabric (product.metafields.shopify.fabric)": fabricHandle,
  };
}

/** Additional image rows — repeat Stan so metaobject validation passes on every line. */
export function mapProductToImageRows(
  product: ProductListingData,
  handle: string,
  stan: string,
): ShopifyCsvRow[] {
  const rows: ShopifyCsvRow[] = [];
  const images = product.images.filter((img) => img.url?.trim());

  for (let i = 1; i < images.length; i += 1) {
    const img = images[i];
    rows.push({
      "URL handle": handle,
      "Product image URL": img.url.trim(),
      "Image position": String(i + 1),
      "Image alt text": img.label?.trim() ?? "",
      ...(stan ? { "Stan (product.metafields.custom.stan)": stan } : {}),
    });
  }

  return rows;
}
