import type { ProductListingData } from "@/lib/map-document-to-product-listing";
import { displayFieldValue } from "@/lib/shopify-field-options";
import { parseMultiValues, displayMultiValue } from "@/lib/multi-value-string";

export function fieldToMultiValues(raw: string | undefined | null): string[] {
  return parseMultiValues(displayFieldValue(raw ?? ""));
}

export function categoryValues(data: ProductListingData): string[] {
  return fieldToMultiValues(data.details.category);
}

export function brandValues(data: ProductListingData): string[] {
  return fieldToMultiValues(data.details.brand);
}

export function conditionValues(data: ProductListingData): string[] {
  return fieldToMultiValues(data.productCondition);
}

export function sizeValues(data: ProductListingData): string[] {
  const fromSize = fieldToMultiValues(data.selectedSize);
  if (fromSize.length) return fromSize;
  return data.variants.sizes
    .filter((s) => s && s !== "—")
    .flatMap((s) => parseMultiValues(s));
}

export function colorValues(data: ProductListingData): string[] {
  const fromColor = fieldToMultiValues(data.selectedColor);
  if (fromColor.length) return fromColor;
  return data.variants.colors.filter((c) => c && c !== "—");
}

export function fabricValues(
  data: ProductListingData,
  ignoreAi: boolean,
): string[] {
  if (ignoreAi) return [];
  return fieldToMultiValues(data.metafields.fabric);
}

export function featureValues(
  data: ProductListingData,
  ignoreAi: boolean,
): string[] {
  if (ignoreAi) return [];
  return fieldToMultiValues(data.variants.feature);
}

export { displayMultiValue };
