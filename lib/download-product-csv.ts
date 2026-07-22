import JSZip from "jszip";
import { buildShopifyProductImportCsv } from "@/lib/csv/shopify-product-csv";
import type { ProductListingData } from "@/lib/map-document-to-product-listing";

export type ProductCsvOpts = {
  sku: string;
  price: string;
  published: boolean;
  shopifyStatus: string;
};

export type TabCsvEntry = {
  index: number;
  product: ProductListingData;
  opts: ProductCsvOpts;
};

export function buildProductListingCsv(
  product: ProductListingData,
  opts: ProductCsvOpts,
): string {
  return buildShopifyProductImportCsv(product, {
    sku: opts.sku,
    price: opts.price,
    published: opts.published,
    shopifyStatus: opts.shopifyStatus,
    includeBom: true,
  });
}

export function safeCsvFilename(title: string, fallbackIndex = 0): string {
  const base =
    (title && title !== "—" ? title : "") || `Image-${fallbackIndex + 1}`;
  return `${base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 72)}.csv`;
}

/** Unique filename when exporting multiple tabs with similar titles. */
export function safeCsvFilenameForTab(
  title: string,
  tabIndex: number,
): string {
  const base =
    (title && title !== "—" ? title : "") || `Image-${tabIndex + 1}`;
  const slug = base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
  return `${slug}-image-${tabIndex + 1}.csv`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadProductListingCsv(
  product: ProductListingData,
  opts: ProductCsvOpts,
  filenameIndex = 0,
): void {
  const csv = buildProductListingCsv(product, opts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerBlobDownload(blob, safeCsvFilename(product.title, filenameIndex));
}

export function downloadTabCsvEntry(entry: TabCsvEntry): void {
  downloadProductListingCsv(entry.product, entry.opts, entry.index);
}

export async function downloadTabCsvEntriesAsZip(
  entries: TabCsvEntry[],
  zipName = "product-csv-export.zip",
): Promise<void> {
  if (entries.length === 0) return;
  if (entries.length === 1) {
    downloadTabCsvEntry(entries[0]!);
    return;
  }

  const zip = new JSZip();
  for (const entry of entries) {
    const csv = buildProductListingCsv(entry.product, entry.opts);
    zip.file(safeCsvFilenameForTab(entry.product.title, entry.index), csv);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(blob, zipName);
}

export async function downloadTabCsvEntriesSeparately(
  entries: TabCsvEntry[],
): Promise<void> {
  for (const entry of entries) {
    downloadTabCsvEntry(entry);
    await new Promise((r) => setTimeout(r, 350));
  }
}

/** Build File objects for Shopify `files` form-data upload. */
export function tabCsvEntriesToFiles(entries: TabCsvEntry[]): File[] {
  return entries.map((entry) => {
    const csv = buildProductListingCsv(entry.product, entry.opts);
    const name = safeCsvFilenameForTab(entry.product.title, entry.index);
    return new File([csv], name, { type: "text/csv;charset=utf-8" });
  });
}
