import type { SingleDocument } from "@/lib/api/documentApi";
import {
  DEFAULT_INVENTORY_QTY,
  DEFAULT_SHOPIFY_PUBLISHED,
  DEFAULT_SHOPIFY_STATUS,
  DEFAULT_STAN,
  DEFAULT_WEIGHT_GRAMS,
  DEFAULT_GOOGLE_CONDITION,
  normalizeStanValue,
} from "@/lib/shopify-field-options";

export interface ProductImage {
  url: string;
  label: string;
  sku: string;
}

export interface ProductDetails {
  category: string;
  brand: string;
  sleeveLength: string;
  dressType: string;
  ageGroup: string;
  gender: string;
}

export interface VariantData {
  sizes: string[];
  colors: string[];
  condition: string;
  feature: string;
}

export interface ProductMetafields {
  productCode: string;
  fabric: string;
  chestWidth: string;
  backLength: string;
  waistWidth: string;
  sleeveLength: string;
  underBust: string;
  dressLength: string;
}

export interface StorageInfo {
  googleDriveFolder: string;
  autoListingStatus: boolean;
  lastProcessed: string;
}

export interface ProductListingData {
  title: string;
  description: string;
  images: ProductImage[];
  mainImage: string;
  details: ProductDetails;
  variants: VariantData;
  metafields: ProductMetafields;
  storage: StorageInfo;
  tags: string[];
  sku: string;
  price: string;
  keyFeatures: string[];
  selectedFeatures: string[];
  availableSizesFromDimensions: string;
  dimensionConfidence: string;
  hasRulerReference: string;
  batchItemStatus: string;
  /** Document / AI run */
  documentId: string;
  catalogProductId: string;
  aiRunStatus: string;
  aiRunMessage: string;
  /** Stan metafield — product condition (Nowy, Bardzo dobry, …) */
  productCondition: string;
  published: boolean;
  shopifyStatus: string;
  selectedSize: string;
  selectedColor: string;
  weightGrams: string;
  inventoryQty: string;
}

/** New API uses `*_cm`; older payloads used `*_in`. Prefer cm when present. */
function linearDim(
  d: Record<string, unknown> | undefined,
  base: string,
): string {
  if (!d) return "—";
  const cm = d[`${base}_cm`];
  const inchVal = d[`${base}_in`];
  if (cm != null && cm !== "") return `${cm} cm`;
  if (inchVal != null && inchVal !== "") return `${inchVal} in`;
  return "—";
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function pickSku(
  skuMap: Record<string, string>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const v = skuMap[k];
    if (typeof v === "string" && v) return v;
  }
  const first = Object.values(skuMap)[0];
  return typeof first === "string" ? first : "";
}

function pushImagesFromBatch(
  batch: Record<string, unknown>,
  images: ProductImage[],
): void {
  const skuMap = (batch.generated_skus ?? {}) as Record<string, string>;

  const add = (url: unknown, label: string, ...skuKeys: string[]) => {
    if (!isNonEmptyString(url)) return;
    images.push({
      url,
      label,
      sku: pickSku(skuMap, ...skuKeys),
    });
  };

  add(batch.original_url, "Original");
  add(
    batch.background_removed_url,
    "Background removed",
    "background_removal",
  );

  const tryOn = batch.virtual_tryon_urls as string[] | undefined;
  tryOn?.forEach((url, i) => {
    if (isNonEmptyString(url)) {
      images.push({
        url,
        label: tryOn.length > 1 ? `Virtual try-on ${i + 1}` : "Virtual try-on",
        sku: pickSku(skuMap, "ai_virtual_tryon", "ai_virtual_tryOn"),
      });
    }
  });

  const modelUrls = batch.model_urls as string[] | undefined;
  modelUrls?.forEach((url, i) => {
    if (isNonEmptyString(url)) {
      images.push({
        url,
        label: modelUrls.length > 1 ? `Model ${i + 1}` : "Model",
        sku: pickSku(skuMap, "model"),
      });
    }
  });

  const mannequinUrls = batch.mannequin_urls as string[] | undefined;
  mannequinUrls?.forEach((url, i) => {
    if (isNonEmptyString(url)) {
      images.push({
        url,
        label: mannequinUrls.length > 1 ? `Mannequin ${i + 1}` : "Mannequin",
        sku: pickSku(skuMap, "mannequin"),
      });
    }
  });

  add(
    batch.image_diagram_url,
    "Measurement diagram",
    "image_diagram",
    "physical_dimensions",
  );
}

/** Pull `images_batch` rows from POST /documents `data.aiGenerated`. */
export function extractImagesBatchFromDocument(
  doc: SingleDocument,
): Record<string, unknown>[] {
  const ai = doc.aiGenerated as
    | { product?: { images_batch?: unknown[] } }
    | null
    | undefined;
  const batch = ai?.product?.images_batch;
  return Array.isArray(batch)
    ? batch.map((row) => row as Record<string, unknown>)
    : [];
}

function readAiRoot(doc: SingleDocument | null | undefined) {
  if (!doc?.aiGenerated || typeof doc.aiGenerated !== "object") {
    return {
      status: "—",
      message: "",
      productId: "",
      ready: false,
    };
  }
  const ai = doc.aiGenerated as {
    status?: string;
    message?: string;
    product_id?: string;
    product?: { id?: string; ready_to_publish?: boolean };
  };
  return {
    status: String(ai.status ?? "—"),
    message: String(ai.message ?? ""),
    productId: String(ai.product?.id ?? ai.product_id ?? ""),
    ready: Boolean(ai.product?.ready_to_publish),
  };
}

export function mapBatchItemToProductListingData(
  batch: Record<string, unknown>,
  doc?: SingleDocument | null,
): ProductListingData {
  const listing = batch.listing as
    | { title?: string; description?: string; fabric?: string; tags?: string[] }
    | undefined;
  const detailsIn = batch.product_details as
    | {
        category?: string;
        brand?: string;
        sleeve_length?: string;
        dress_type?: string;
        age_group?: string;
        gender?: string;
        condition?: string;
      }
    | undefined;
  const variant = batch.variant_data as
    | {
        sizes?: string[];
        colors?: string[];
        condition?: string;
        feature?: string;
      }
    | undefined;
  const d = batch.dimensions as Record<string, unknown> | undefined;
  const sizesArr = d?.available_sizes;
  const availableSizesFromDimensions = Array.isArray(sizesArr)
    ? sizesArr.map(String).join(", ")
    : "—";

  const conf = d?.confidence;
  const dimensionConfidence =
    conf == null || conf === "" ? "—" : String(conf);

  const ruler = d?.has_ruler_reference;
  const hasRulerReference =
    ruler === true ? "Yes" : ruler === false ? "No" : "—";

  const images: ProductImage[] = [];
  pushImagesFromBatch(batch, images);

  if (images.length === 0) {
    images.push({
      url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80",
      label: "Preview unavailable",
      sku: "",
    });
  }

  const title = String(
    batch.product_title ?? listing?.title ?? "Generated product",
  );
  const description = String(
    batch.description ?? listing?.description ?? "",
  );

  const tagSet = new Set<string>();
  for (const t of (batch.tags as string[]) ?? []) if (t) tagSet.add(t);
  for (const t of (batch.seo_tags as string[]) ?? []) if (t) tagSet.add(t);
  for (const t of listing?.tags ?? []) if (t) tagSet.add(t);
  const tags = tagSet.size > 0 ? [...tagSet] : ["listing"];

  const keyFeatures = Array.isArray(batch.key_features)
    ? (batch.key_features as unknown[]).map(String).filter(Boolean)
    : [];

  const selectedFeatures = Array.isArray(batch.selected_features)
    ? (batch.selected_features as unknown[]).map(String).filter(Boolean)
    : [];

  const batchItemStatus = isNonEmptyString(batch.status)
    ? batch.status
    : "—";

  const aiRoot = readAiRoot(doc ?? null);

  const selectedSizeRaw = d?.selected_size;
  const selectedSize =
    selectedSizeRaw != null && String(selectedSizeRaw).trim() !== ""
      ? String(selectedSizeRaw)
      : Array.isArray(sizesArr) && sizesArr.length > 0
        ? String(sizesArr[0])
        : variant?.sizes?.length
          ? String(variant.sizes[0])
          : "—";

  const colors = variant?.colors?.length
    ? variant.colors.map(String).filter((c) => c && c !== "—")
    : [];
  const selectedColor =
    batch.selected_color != null && String(batch.selected_color).trim() !== ""
      ? String(batch.selected_color)
      : colors[0] ?? "—";

  const rawProductCondition =
    detailsIn?.condition != null && String(detailsIn.condition).trim() !== ""
      ? String(detailsIn.condition)
      : batch.product_condition != null &&
          String(batch.product_condition).trim() !== ""
        ? String(batch.product_condition)
        : "";

  const normalizedStan = normalizeStanValue(rawProductCondition);
  const productCondition = normalizedStan || DEFAULT_STAN;

  const published =
    batch.shopify_published === false ? false : DEFAULT_SHOPIFY_PUBLISHED;

  const shopifyStatus =
    batch.shopify_status != null && String(batch.shopify_status).trim() !== ""
      ? String(batch.shopify_status)
      : DEFAULT_SHOPIFY_STATUS;

  const weightGrams =
    batch.weight_grams != null && String(batch.weight_grams).trim() !== ""
      ? String(batch.weight_grams)
      : DEFAULT_WEIGHT_GRAMS;

  const inventoryQty =
    batch.inventory_qty != null && String(batch.inventory_qty).trim() !== ""
      ? String(batch.inventory_qty)
      : DEFAULT_INVENTORY_QTY;

  return {
    title,
    description,
    images,
    mainImage: images[0]?.url ?? "",
    details: {
      category: String(detailsIn?.category ?? "—"),
      brand: String(detailsIn?.brand ?? "—"),
      sleeveLength: String(detailsIn?.sleeve_length ?? "—"),
      dressType: String(detailsIn?.dress_type ?? "—"),
      ageGroup: String(detailsIn?.age_group ?? "—"),
      gender: String(detailsIn?.gender ?? "—"),
    },
    variants: {
      sizes: variant?.sizes?.length ? variant.sizes.map(String) : ["—"],
      colors: variant?.colors?.length ? variant.colors.map(String) : ["—"],
      condition:
        variant?.condition != null &&
        String(variant.condition).trim() !== "" &&
        String(variant.condition).trim() !== "—"
          ? String(variant.condition).trim()
          : DEFAULT_GOOGLE_CONDITION,
      feature: String(variant?.feature ?? "—"),
    },
    metafields: {
      productCode: String(batch.product_code ?? "—"),
      fabric: String(batch.fabric ?? listing?.fabric ?? "—"),
      chestWidth: linearDim(d, "chest_width"),
      backLength: linearDim(d, "back_length"),
      waistWidth: linearDim(d, "waist_width"),
      sleeveLength: linearDim(d, "sleeve_length"),
      underBust: linearDim(d, "under_bust"),
      dressLength: linearDim(d, "dress_length"),
    },
    storage: {
      googleDriveFolder: "/AutoList/Processed",
      autoListingStatus: aiRoot.ready,
      lastProcessed: String(
        batch.updated_at ?? doc?.updatedAt ?? doc?.createdAt ?? "—",
      ),
    },
    tags,
    sku: "",
    price: "",
    keyFeatures,
    selectedFeatures,
    availableSizesFromDimensions,
    dimensionConfidence,
    hasRulerReference,
    batchItemStatus,
    documentId: String(doc?.id ?? "—"),
    catalogProductId: aiRoot.productId || "—",
    aiRunStatus: aiRoot.status,
    aiRunMessage: aiRoot.message,
    productCondition,
    published,
    shopifyStatus,
    selectedSize,
    selectedColor,
    weightGrams,
    inventoryQty,
  };
}
