import { buildShopifyProductImportCsv } from "@/lib/csv/shopify-product-csv";
import type { ProductListingData } from "@/lib/map-document-to-product-listing";

export type ProductCsvOpts = {
  sku: string;
  price: string;
  published: boolean;
  shopifyStatus: string;
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
    (title && title !== "—" ? title : "") || `Doc-${fallbackIndex + 1}`;
  return `${base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80)}.csv`;
}

export function downloadProductListingCsv(
  product: ProductListingData,
  opts: ProductCsvOpts,
  filenameIndex = 0,
): void {
  const csv = buildProductListingCsv(product, opts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeCsvFilename(product.title, filenameIndex);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
