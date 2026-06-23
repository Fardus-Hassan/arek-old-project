import type { SingleDocument } from "@/lib/api/documentApi";
import type { StoredGeneratedPayload } from "@/lib/generated-document-storage";
import { extractImagesBatchFromDocument } from "@/lib/map-document-to-product-listing";

export type ImageBatchRow = Record<string, unknown>;

export function deepClonePayload(
  p: StoredGeneratedPayload,
): StoredGeneratedPayload {
  return JSON.parse(JSON.stringify(p)) as StoredGeneratedPayload;
}

export function ensureNestedObject(
  row: ImageBatchRow,
  key: "listing" | "variant_data" | "product_details" | "dimensions",
): Record<string, unknown> {
  const cur = row[key];
  if (!cur || typeof cur !== "object") {
    const next: Record<string, unknown> = {};
    row[key] = next;
    return next;
  }
  return cur as Record<string, unknown>;
}

/** Prefer cm key if present, else in, else default to cm for new values. */
function dimensionValueKey(
  dim: Record<string, unknown> | undefined,
  base: string,
): "_cm" | "_in" {
  const d = dim ?? {};
  if (d[`${base}_cm`] != null && d[`${base}_cm`] !== "") return "_cm";
  if (d[`${base}_in`] != null && d[`${base}_in`] !== "") return "_in";
  return "_cm";
}

export function getDimInputValue(
  dim: Record<string, unknown> | undefined,
  base: string,
): string {
  const d = dim ?? {};
  const suffix = dimensionValueKey(dim, base);
  const v = d[`${base}${suffix}`];
  if (v == null || v === "") return "";
  return String(v);
}

export function setDimInputValue(
  batch: ImageBatchRow,
  base: string,
  raw: string,
): void {
  const dims = ensureNestedObject(batch, "dimensions");
  const suffix = dimensionValueKey(dims, base);
  const key = `${base}${suffix}`;
  const trimmed = raw.trim();
  if (trimmed === "") {
    dims[key] = null;
    return;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return;
  dims[key] = n;
}

export function parseListFromDelimited(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parsePriceForApi(raw: string): number | string | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : t;
}

export function readAiSkuPrice(doc: SingleDocument): { sku: string; price: string } {
  const ag = doc.aiGenerated as Record<string, unknown> | undefined;
  if (!ag) return { sku: "", price: "" };
  const sku = ag.sku != null ? String(ag.sku) : "";
  const price = ag.price != null ? String(ag.price) : "";
  return { sku, price };
}

/** Per-tab SKU/price from each `images_batch` row (`sku` / `price` on row). */
export function skuPriceMapsFromDocument(doc: SingleDocument): {
  skuByTab: Record<number, string>;
  priceByTab: Record<number, string>;
} {
  const skuByTab: Record<number, string> = {};
  const priceByTab: Record<number, string> = {};
  const rows = extractImagesBatchFromDocument(doc);
  rows.forEach((row, idx) => {
    const r = row as Record<string, unknown>;
    skuByTab[idx] = r.sku != null ? String(r.sku) : "";
    priceByTab[idx] = r.price != null ? String(r.price) : "";
  });
  if (rows.length === 0) {
    const { sku, price } = readAiSkuPrice(doc);
    skuByTab[0] = sku;
    priceByTab[0] = price;
  }
  return { skuByTab, priceByTab };
}

/** Cancel edit on one tab: restore that row from a full-payload snapshot taken at beginEdit. */
export function restoreImagesBatchTabFromSnapshot(
  current: StoredGeneratedPayload,
  snapshot: StoredGeneratedPayload,
  tabIndex: number,
): StoredGeneratedPayload {
  const next = deepClonePayload(current);
  const snapRows = extractImagesBatchFromDocument(snapshot.document);
  const snapRow = snapRows[tabIndex];
  if (snapRow == null) return next;

  const ai = next.document.aiGenerated as Record<string, unknown> | null;
  if (!ai || typeof ai !== "object") return next;
  const product = { ...(ai.product as Record<string, unknown>) };
  const batch = [...((product.images_batch as unknown[]) ?? [])];
  if (tabIndex < 0 || tabIndex >= batch.length) return next;
  batch[tabIndex] = JSON.parse(JSON.stringify(snapRow)) as unknown;
  product.images_batch = batch;
  ai.product = product;
  next.document.aiGenerated = ai;
  return next;
}
