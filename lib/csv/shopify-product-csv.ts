import type { ProductListingData } from "@/lib/map-document-to-product-listing";
import { SHOPIFY_PRODUCT_IMPORT_COLUMNS } from "./shopify-csv-columns";
import {
  buildShopifyHandle,
  mapProductToImageRows,
  mapProductToPrimaryRow,
  type ShopifyCsvBuildOpts,
  type ShopifyCsvRow,
} from "./shopify-csv-mapper";

export { buildShopifyHandle } from "./shopify-csv-mapper";
export { buildDescriptionHtml } from "./shopify-csv-mapper";
export { SHOPIFY_PRODUCT_IMPORT_COLUMNS } from "./shopify-csv-columns";

function escapeCsvCell(s: string): string {
  const needs = /[",\r\n]/.test(s);
  const escaped = String(s).replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

function rowToCells(row: ShopifyCsvRow): string[] {
  return SHOPIFY_PRODUCT_IMPORT_COLUMNS.map((col) => row[col] ?? "");
}

export function buildShopifyProductImportCsv(
  product: ProductListingData,
  opts: ShopifyCsvBuildOpts & { includeBom?: boolean },
): string {
  const primaryRow = mapProductToPrimaryRow(product, opts);
  const handle = primaryRow["URL handle"] ?? buildShopifyHandle(product);
  const stan = primaryRow["Stan (product.metafields.custom.stan)"] ?? "";
  const imageRows = mapProductToImageRows(product, handle, stan);

  const allRows = [primaryRow, ...imageRows];
  const headerLine = SHOPIFY_PRODUCT_IMPORT_COLUMNS.map(escapeCsvCell).join(",");
  const bodyLines = allRows
    .map((row) => rowToCells(row).map(escapeCsvCell).join(","))
    .join("\r\n");
  const csv = `${headerLine}\r\n${bodyLines}\r\n`;
  return opts.includeBom !== false ? `\uFEFF${csv}` : csv;
}
