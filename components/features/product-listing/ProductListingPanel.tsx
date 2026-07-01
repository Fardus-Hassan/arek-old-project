"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import {
  EditableInlineField,
  EditableTextBlock,
} from "@/components/features/ai-result/EditableTextBlock";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import {
  GenderDisplayValue,
  GenderRadioField,
} from "@/components/shared/GenderRadioField";
import { OptionLanguageSelect } from "@/components/features/ai-result/OptionLanguageSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ensureNestedObject,
  getDimInputValue,
  parseListFromDelimited,
  setDimInputValue,
  type ImageBatchRow,
} from "@/lib/ai-result-document-helpers";
import type { ProductListingData } from "@/lib/map-document-to-product-listing";
import {
  GOOGLE_CONDITION_OPTIONS,
  STATUS_OPTIONS,
  displayFieldValue,
  normalizeGoogleCondition,
} from "@/lib/shopify-field-options";
import {
  readGenerationLanguage,
  type OutputLanguage,
} from "@/lib/feature-catalog";
import { useFeatureCatalogOptions } from "@/lib/hooks/useFeatureCatalogOptions";
import { skuPriceInputClass } from "./product-listing-ui";

export type ProductListingPanelProps = {
  productData: ProductListingData;
  isEditing: boolean;
  canEdit: boolean;
  dimensions?: Record<string, unknown>;
  sku: string;
  price: string;
  onSkuChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onBatchUpdate: (updater: (batch: ImageBatchRow) => void) => void;
  selectedImage?: number;
  onSelectedImageChange?: (index: number) => void;
  showImages?: boolean;
  showActionButtons?: boolean;
  onDownload?: () => void;
  onSaveToDrive?: () => void;
  isSavingCsv?: boolean;
  compact?: boolean;
  initialOptionsLanguage?: OutputLanguage;
};

export function ProductListingPanel({
  productData,
  isEditing,
  canEdit,
  dimensions,
  sku,
  price,
  onSkuChange,
  onPriceChange,
  onBatchUpdate,
  selectedImage = 0,
  onSelectedImageChange,
  showImages = true,
  showActionButtons = true,
  onDownload,
  onSaveToDrive,
  isSavingCsv = false,
  compact = false,
  initialOptionsLanguage,
}: ProductListingPanelProps) {
  const [optionsLanguage, setOptionsLanguage] = useState<OutputLanguage>(
    () => initialOptionsLanguage ?? readGenerationLanguage(),
  );
  const { catalog } = useFeatureCatalogOptions(optionsLanguage);

  const maxImageIndex = Math.max(0, productData.images.length - 1);
  const safeSelectedImage = Math.min(selectedImage, maxImageIndex);

  const showSkuPriceSection =
    canEdit ||
    isEditing ||
    sku.trim().length > 0 ||
    price.trim().length > 0;

  const applyBatchUpdate = onBatchUpdate;

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8"
      }>
      {showImages && productData.images.length > 0 && (
        <div className={compact ? "" : "col-span-1 lg:col-span-2"}>
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
            Image Outputs
          </h2>
          <div
            className={
              compact
                ? "grid grid-cols-3 gap-2 sm:gap-3"
                : "space-y-3 sm:space-y-4"
            }>
            {productData.images.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className={`bg-white border border-gray-200 rounded-lg overflow-hidden transition-all ${
                  onSelectedImageChange ? "cursor-pointer" : ""
                } ${
                  safeSelectedImage === index ? "ring-2 ring-[#A825C7]" : ""
                }`}
                onClick={() => onSelectedImageChange?.(index)}>
                <div
                  className={`relative w-full ${
                    compact
                      ? "aspect-[3/4] bg-white"
                      : "aspect-3/4 min-h-[220px] sm:min-h-[280px] bg-gray-100"
                  }`}>
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt={image.label}
                      className={compact ? "object-contain" : "object-cover"}
                      fill
                      sizes={
                        compact
                          ? "(max-width: 768px) 30vw, 200px"
                          : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      }
                      unoptimized={
                        image.url.includes("amazonaws.com") ||
                        image.url.startsWith("http://")
                      }
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div
                  className={`px-2 bg-white border-t border-gray-100 ${
                    compact ? "py-1.5" : "px-3 py-2 flex items-center justify-between gap-2"
                  }`}>
                  <span
                    className={`block text-gray-600 truncate ${
                      compact ? "text-[10px] leading-tight" : "text-xs"
                    }`}
                    title={image.label}>
                    {image.label}
                  </span>
                  {!compact && image.sku ? (
                    <span className="text-xs text-gray-400 shrink-0">
                      {image.sku}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={
          compact ? "space-y-4" : "space-y-4 sm:space-y-6 col-span-1 lg:col-span-3"
        }>
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">
            Product Listing
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <EditableTextBlock
              label="Product Title"
              editing={isEditing}
              variant="title"
              value={productData.title}
              onChange={(v) =>
                applyBatchUpdate((b) => {
                  b.product_title = v;
                  ensureNestedObject(b, "listing").title = v;
                })
              }
            />
            <EditableTextBlock
              label="Description"
              editing={isEditing}
              multiline
              rows={5}
              value={productData.description}
              onChange={(v) =>
                applyBatchUpdate((b) => {
                  b.description = v;
                  ensureNestedObject(b, "listing").description = v;
                })
              }
            />
            {productData.selectedFeatures.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Selected AI features
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {productData.selectedFeatures.map((f) => (
                    <span
                      key={f}
                      className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-[#7c3aed]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {((isEditing && canEdit) || productData.keyFeatures.length > 0) &&
              (isEditing ? (
                <EditableTextBlock
                  label="Key features (one per line)"
                  editing
                  multiline
                  rows={6}
                  value={productData.keyFeatures.join("\n")}
                  onChange={(v) =>
                    applyBatchUpdate((b) => {
                      b.key_features = v
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean);
                    })
                  }
                />
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Key features
                  </label>
                  <ul className="list-disc pl-4 text-xs sm:text-sm text-gray-700 space-y-1">
                    {productData.keyFeatures.map((kf) => (
                      <li key={kf}>{kf}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>

        {((isEditing && canEdit) || productData.selectedSize !== "—") && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
              Sizing & measurement
            </h3>
            <div>
              <span className="text-gray-500 block mb-1 text-xs">Size</span>
              {isEditing && canEdit ? (
                <SearchableSelect
                  className={skuPriceInputClass}
                  placeholder="Select size"
                  options={catalog.size}
                  value={displayFieldValue(
                    dimensions?.selected_size != null
                      ? String(dimensions.selected_size)
                      : productData.selectedSize,
                  )}
                  onValueChange={(v) =>
                    applyBatchUpdate((b) => {
                      const d = ensureNestedObject(b, "dimensions");
                      d.selected_size = v;
                      d.available_sizes = [v];
                      const vd = ensureNestedObject(b, "variant_data");
                      vd.sizes = [v];
                    })
                  }
                />
              ) : (
                <p className="text-xs sm:text-sm text-gray-900">
                  {productData.selectedSize}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditing && canEdit && (
            <div className="md:col-span-2 flex justify-end">
              <OptionLanguageSelect
                value={optionsLanguage}
                onChange={setOptionsLanguage}
              />
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
              Product Details
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <span className="text-gray-500 block mb-1 text-xs">Category</span>
                {isEditing && canEdit ? (
                  <SearchableSelect
                    className={skuPriceInputClass}
                    placeholder="Select category"
                    options={catalog.category}
                    value={displayFieldValue(productData.details.category)}
                    onValueChange={(v) =>
                      applyBatchUpdate((b) => {
                        ensureNestedObject(b, "product_details").category = v;
                      })
                    }
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-gray-900">
                    {productData.details.category}
                  </p>
                )}
              </div>
              <div>
                <span className="text-gray-500 block mb-1 text-xs">Brand</span>
                {isEditing && canEdit ? (
                  <SearchableSelect
                    className={skuPriceInputClass}
                    placeholder="Select brand"
                    options={catalog.brand}
                    value={displayFieldValue(productData.details.brand)}
                    onValueChange={(v) =>
                      applyBatchUpdate((b) => {
                        ensureNestedObject(b, "product_details").brand = v;
                      })
                    }
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-gray-900">
                    {productData.details.brand}
                  </p>
                )}
              </div>
              <div>
                <span className="text-gray-500 block mb-1 text-xs">
                  Condition (Stan)
                </span>
                {isEditing && canEdit ? (
                  <SearchableSelect
                    className={skuPriceInputClass}
                    placeholder="Select condition"
                    options={catalog.condition}
                    value={displayFieldValue(productData.productCondition)}
                    onValueChange={(v) =>
                      applyBatchUpdate((b) => {
                        b.product_condition = v;
                        ensureNestedObject(b, "product_details").condition = v;
                      })
                    }
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-gray-900">
                    {productData.productCondition}
                  </p>
                )}
              </div>
              <div>
                <span className="text-gray-500 block mb-1 text-xs">Gender</span>
                {isEditing && canEdit ? (
                  <GenderRadioField
                    name="product-gender"
                    options={catalog.gender}
                    value={productData.details.gender}
                    onChange={(v) =>
                      applyBatchUpdate((b) => {
                        ensureNestedObject(b, "product_details").gender = v;
                      })
                    }
                  />
                ) : (
                  <GenderDisplayValue value={productData.details.gender} />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
              Product Metafields
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <EditableInlineField
                label="Product Code"
                editing={isEditing}
                value={
                  isEditing && productData.metafields.productCode === "—"
                    ? ""
                    : productData.metafields.productCode
                }
                onChange={(v) =>
                  applyBatchUpdate((b) => {
                    b.product_code = v;
                  })
                }
              />
              <div>
                <span className="text-gray-500 block mb-1 text-xs">Fabric</span>
                {isEditing && canEdit ? (
                  <SearchableSelect
                    className={skuPriceInputClass}
                    placeholder="Select fabric"
                    options={catalog.fabric}
                    value={displayFieldValue(productData.metafields.fabric)}
                    onValueChange={(v) =>
                      applyBatchUpdate((b) => {
                        b.fabric = v;
                        ensureNestedObject(b, "listing").fabric = v;
                      })
                    }
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-gray-900">
                    {productData.metafields.fabric}
                  </p>
                )}
              </div>
              {(
                [
                  ["Chest Width", "chest_width", "chestWidth"],
                  ["Back Length", "back_length", "backLength"],
                  ["Waist Width", "waist_width", "waistWidth"],
                  ["Sleeve (body) length", "sleeve_length", "sleeveLength"],
                  ["Under Bust", "under_bust", "underBust"],
                  ["Dress Length", "dress_length", "dressLength"],
                ] as const
              ).map(([label, base, mfKey]) =>
                isEditing ? (
                  <EditableInlineField
                    key={base}
                    label={`${label} (number)`}
                    editing
                    value={getDimInputValue(dimensions, base)}
                    onChange={(v) =>
                      applyBatchUpdate((b) => {
                        setDimInputValue(b, base, v);
                      })
                    }
                  />
                ) : (
                  <div key={base}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {label}
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {
                        productData.metafields[
                          mfKey as keyof typeof productData.metafields
                        ]
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
              Variant & Google Data
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {isEditing ? (
                <>
                  <div>
                    <span className="text-gray-500 block mb-1 text-xs">
                      Size
                    </span>
                    <SearchableSelect
                      className={skuPriceInputClass}
                      placeholder="Select size"
                      options={catalog.size}
                      value={displayFieldValue(productData.selectedSize)}
                      onValueChange={(v) =>
                        applyBatchUpdate((b) => {
                          const d = ensureNestedObject(b, "dimensions");
                          d.selected_size = v;
                          d.available_sizes = [v];
                          const vd = ensureNestedObject(b, "variant_data");
                          vd.sizes = [v];
                        })
                      }
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1 text-xs">
                      Color
                    </span>
                    <SearchableSelect
                      className={skuPriceInputClass}
                      placeholder="Select color"
                      options={catalog.color}
                      value={displayFieldValue(productData.selectedColor)}
                      onValueChange={(v) =>
                        applyBatchUpdate((b) => {
                          b.selected_color = v;
                          const vd = ensureNestedObject(b, "variant_data");
                          vd.colors = v ? [v] : [];
                        })
                      }
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1 text-xs">
                      Google Condition
                    </span>
                    <SearchableSelect
                      className={skuPriceInputClass}
                      placeholder="new / used"
                      options={GOOGLE_CONDITION_OPTIONS}
                      allowCustom={false}
                      value={normalizeGoogleCondition(
                        productData.variants.condition,
                      )}
                      onValueChange={(v) =>
                        applyBatchUpdate((b) => {
                          ensureNestedObject(b, "variant_data").condition = v;
                        })
                      }
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1 text-xs">
                      Feature (Wzór)
                    </span>
                    <SearchableSelect
                      className={skuPriceInputClass}
                      placeholder="Select feature"
                      options={catalog.feature}
                      value={displayFieldValue(productData.variants.feature)}
                      onValueChange={(v) =>
                        applyBatchUpdate((b) => {
                          ensureNestedObject(b, "variant_data").feature = v;
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Size
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {productData.selectedSize}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Color
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {productData.selectedColor}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Google Condition
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                          {normalizeGoogleCondition(
                            productData.variants.condition,
                          )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Feature (Wzór)
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {productData.variants.feature}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
              Tags
            </h3>
            {isEditing ? (
              <EditableTextBlock
                label="Tags (comma-separated)"
                editing
                multiline
                rows={3}
                value={productData.tags.join(", ")}
                onChange={(v) =>
                  applyBatchUpdate((b) => {
                    const arr = parseListFromDelimited(v);
                    b.tags = arr;
                    ensureNestedObject(b, "listing").tags = arr;
                    b.seo_tags = arr;
                  })
                }
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {productData.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {showSkuPriceSection && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                SKU
              </label>
              <input
                type="text"
                value={sku}
                readOnly={!canEdit || !isEditing}
                onChange={(e) => onSkuChange(e.target.value)}
                placeholder="Write here"
                className={`${skuPriceInputClass} ${
                  !canEdit || !isEditing
                    ? "bg-gray-50 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Price
              </label>
              <input
                type="text"
                value={price}
                readOnly={!canEdit || !isEditing}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder="Write here"
                className={`${skuPriceInputClass} ${
                  !canEdit || !isEditing
                    ? "bg-gray-50 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Published
                </label>
                <Select
                  value={productData.published ? "TRUE" : "FALSE"}
                  disabled={!canEdit || !isEditing}
                  onValueChange={(v) =>
                    applyBatchUpdate((b) => {
                      b.shopify_published = v === "TRUE";
                    })
                  }>
                  <SelectTrigger className={skuPriceInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRUE">TRUE</SelectItem>
                    <SelectItem value="FALSE">FALSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={productData.shopifyStatus}
                  disabled={!canEdit || !isEditing}
                  onValueChange={(v) =>
                    applyBatchUpdate((b) => {
                      b.shopify_status = v;
                    })
                  }>
                  <SelectTrigger className={skuPriceInputClass}>
                    <SelectValue placeholder="Draft" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {showActionButtons && (onDownload || onSaveToDrive) && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#A825C7] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-500 transition-colors">
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            )}
            {onSaveToDrive && (
              <button
                type="button"
                onClick={onSaveToDrive}
                disabled={isSavingCsv}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                {isSavingCsv ? "Saving..." : "Save to Drive"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function isProductBatchRow(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    row.image_index != null ||
    row.listing != null ||
    row.product_details != null ||
    row.variant_data != null
  );
}

export { isProductBatchRow };
