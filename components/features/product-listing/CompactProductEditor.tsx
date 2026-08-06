"use client";

import React, { useState } from "react";
import { EditableTextBlock } from "@/components/features/ai-result/EditableTextBlock";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { SearchableMultiSelect } from "@/components/shared/SearchableMultiSelect";
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
  removeImageUrlFromBatchRow,
  setDimInputValue,
  type ImageBatchRow,
} from "@/lib/ai-result-document-helpers";
import type { ProductListingData } from "@/lib/map-document-to-product-listing";
import {
  isZeroOrEmptyDim,
  type ProductImage,
} from "@/lib/map-document-to-product-listing";
import { ImageOutputOrderStrip } from "@/components/features/ai-result/ImageOutputOrderStrip";
import {
  GOOGLE_CONDITION_OPTIONS,
  STATUS_OPTIONS,
  normalizeGoogleCondition,
} from "@/lib/shopify-field-options";
import {
  readGenerationLanguage,
  type OutputLanguage,
} from "@/lib/feature-catalog";
import { useFeatureCatalogOptions } from "@/lib/hooks/useFeatureCatalogOptions";
import { joinMultiValues } from "@/lib/multi-value-string";
import {
  brandValues,
  categoryValues,
  colorValues,
  conditionValues,
  displayMultiValue,
  fabricValues,
  featureValues,
  sizeValues,
} from "@/lib/catalog-field-values";
import {
  clearFabricPending,
  clearFeaturePending,
  isFabricPending,
  isFeaturePending,
} from "@/lib/fabric-feature-pending";
import { cn } from "@/lib/utils";

/** Client-mockup sized inputs */
const fieldClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50";

const multiFieldClass =
  "min-h-9 w-full rounded-lg border border-slate-200 bg-white !py-1.5 text-sm text-slate-900 outline-none focus:border-purple-300";

const labelClass = "mb-1 block text-xs font-medium text-slate-500";

const DIM_FIELDS = [
  ["Length", "dress_length", "dressLength"],
  ["Hip Width", "hip_width", "hipWidth"],
  ["Sleeve length", "sleeve_length", "sleeveLength"],
  ["Chest Width", "chest_width", "chestWidth"],
  ["Collar Circumference", "collar_circumference", "collarCircumference"],
  ["Back length", "back_length", "backLength"],
  ["Waist width", "waist_width", "waistWidth"],
  ["Shoe insert", "shoe_size", "shoeInsertLength"],
  ["Under Bust", "under_bust", "underBust"],
] as const;

export type CompactProductEditorProps = {
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
  onImagesReorder?: (nextImages: ProductImage[]) => void;
  documentId?: string;
  awaitFabricFeatureSelection?: boolean;
  initialOptionsLanguage?: OutputLanguage;
  footer?: React.ReactNode;
  /** Status + Edit/Cancel shown beside the Gender label */
  genderToolbar?: React.ReactNode;
  className?: string;
};

function FieldShell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

function ReadValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex h-9 items-center truncate rounded-lg border border-transparent px-1 text-sm text-slate-900">
      {children}
    </p>
  );
}

export function CompactProductEditor({
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
  onImagesReorder,
  documentId,
  awaitFabricFeatureSelection = false,
  initialOptionsLanguage,
  footer,
  genderToolbar,
  className,
}: CompactProductEditorProps) {
  const [optionsLanguage, setOptionsLanguage] = useState<OutputLanguage>(
    () => initialOptionsLanguage ?? readGenerationLanguage(),
  );
  const { catalog } = useFeatureCatalogOptions(optionsLanguage);

  const fabricPending =
    awaitFabricFeatureSelection && isFabricPending(documentId);
  const featurePending =
    awaitFabricFeatureSelection && isFeaturePending(documentId);

  const maxImageIndex = Math.max(0, productData.images.length - 1);
  const safeSelectedImage = Math.min(selectedImage, maxImageIndex);
  const editable = isEditing && canEdit;
  const applyBatchUpdate = onBatchUpdate;

  const handleImageReorder = (nextImages: ProductImage[]) => {
    if (onImagesReorder) {
      onImagesReorder(nextImages);
      return;
    }
    const selectedUrl = productData.images[safeSelectedImage]?.url;
    applyBatchUpdate((b) => {
      b.image_output_order = nextImages.map((img) => img.url).filter(Boolean);
    });
    if (selectedUrl && onSelectedImageChange) {
      const newIdx = nextImages.findIndex((img) => img.url === selectedUrl);
      if (newIdx >= 0) onSelectedImageChange(newIdx);
      else onSelectedImageChange(0);
    }
  };

  const handleImageRemove = (index: number) => {
    const removed = productData.images[index];
    if (!removed?.url) return;
    const nextImages = productData.images.filter((_, i) => i !== index);
    const selectedUrl = productData.images[safeSelectedImage]?.url;

    applyBatchUpdate((b) => {
      removeImageUrlFromBatchRow(b, removed.url);
      b.image_output_order = nextImages.map((img) => img.url).filter(Boolean);
    });

    if (onSelectedImageChange) {
      if (selectedUrl && selectedUrl !== removed.url) {
        const newIdx = nextImages.findIndex((img) => img.url === selectedUrl);
        onSelectedImageChange(newIdx >= 0 ? newIdx : 0);
      } else {
        onSelectedImageChange(
          Math.min(index, Math.max(0, nextImages.length - 1)),
        );
      }
    }
  };

  const onFabricChange = (vals: string[]) => {
    const joined = joinMultiValues(vals);
    applyBatchUpdate((b) => {
      b.fabric = joined;
      ensureNestedObject(b, "listing").fabric = joined;
    });
    if (vals.length > 0) clearFabricPending(documentId);
  };

  const onFeatureChange = (vals: string[]) => {
    const joined = joinMultiValues(vals);
    applyBatchUpdate((b) => {
      ensureNestedObject(b, "variant_data").feature = joined;
    });
    if (vals.length > 0) clearFeaturePending(documentId);
  };

  const onSizeChange = (vals: string[]) => {
    const next = vals.slice(-1);
    applyBatchUpdate((b) => {
      const d = ensureNestedObject(b, "dimensions");
      d.selected_size = joinMultiValues(next);
      d.available_sizes = next;
      const vd = ensureNestedObject(b, "variant_data");
      vd.sizes = next;
    });
  };

  const selectedLabel =
    productData.images[safeSelectedImage]?.label ?? "—";
  const mediaChips = productData.selectedFeatures.filter(Boolean);
  const sizeDisplayValues = sizeValues(productData);
  const sizeDisplayText =
    sizeDisplayValues.length > 0
      ? joinMultiValues(sizeDisplayValues)
      : "—";

  const missingPublishFields =
    (!price.trim() ? 1 : 0) + (!sku.trim() ? 1 : 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {productData.images.length > 0 && (
        <ImageOutputOrderStrip
          dense
          fillRow
          enableLightbox
          canReorder={editable}
          images={productData.images}
          selectedIndex={safeSelectedImage}
          onSelect={(index) => onSelectedImageChange?.(index)}
          onReorder={handleImageReorder}
          onRemove={editable ? handleImageRemove : undefined}
        />
      )}

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {/* LEFT column — single panel */}
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {editable && (
            <div className="flex justify-end">
              <OptionLanguageSelect
                value={optionsLanguage}
                onChange={setOptionsLanguage}
              />
            </div>
          )}

          <EditableTextBlock
            label="Product Title"
            editing={editable}
            dense
            variant="title"
            value={productData.title === "—" ? "" : productData.title}
            onChange={(v) =>
              applyBatchUpdate((b) => {
                b.product_title = v;
                ensureNestedObject(b, "listing").title = v;
              })
            }
          />

          <EditableTextBlock
            label="Description"
            editing={editable}
            dense
            multiline
            rows={3}
            value={
              productData.description === "—" ? "" : productData.description
            }
            onChange={(v) =>
              applyBatchUpdate((b) => {
                b.description = v;
                ensureNestedObject(b, "listing").description = v;
              })
            }
          />

          {(editable || productData.keyFeatures.length > 0) &&
            (editable ? (
              <EditableTextBlock
                label="Key features (one per line)"
                editing
                dense
                multiline
                rows={3}
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
                <span className={labelClass}>Key features</span>
                <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
                  {productData.keyFeatures.map((kf) => (
                    <li key={kf}>{kf}</li>
                  ))}
                </ul>
              </div>
            ))}

          <div>
            <p className="mb-1.5 text-xs text-slate-500">
              Media:{" "}
              <span className="font-semibold text-slate-700">
                {productData.images.length} outputs
              </span>
              {selectedLabel !== "—" ? (
                <>
                  {" "}
                  · selected:{" "}
                  <span className="font-medium text-slate-700">
                    {selectedLabel}
                  </span>
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(mediaChips.length > 0
                ? mediaChips
                : productData.images.map((i) => i.label)
              )
                .slice(0, 10)
                .map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-[#7c3aed]">
                    {chip}
                  </span>
                ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Tags</span>
            {editable ? (
              <SearchableMultiSelect
                className={multiFieldClass}
                placeholder="Select or type tags…"
                options={catalog.tag}
                values={productData.tags.filter((t) => t && t !== "—")}
                onValuesChange={(vals) => {
                  applyBatchUpdate((b) => {
                    b.tags = vals;
                    ensureNestedObject(b, "listing").tags = vals;
                    b.seo_tags = vals;
                  });
                }}
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {productData.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldShell label="Category">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Category"
                  selectionMode="single"
                  options={catalog.category}
                  values={categoryValues(productData).slice(0, 1)}
                  onValuesChange={(vals) =>
                    applyBatchUpdate((b) => {
                      ensureNestedObject(b, "product_details").category =
                        joinMultiValues(vals.slice(-1));
                    })
                  }
                />
              ) : (
                <ReadValue>
                  {displayMultiValue(productData.details.category)}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Status">
              <Select
                value={productData.shopifyStatus}
                disabled={!editable}
                onValueChange={(v) =>
                  applyBatchUpdate((b) => {
                    b.shopify_status = v;
                  })
                }>
                <SelectTrigger className={cn(fieldClass, "w-full")}>
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
            </FieldShell>
            <FieldShell label="Published">
              <Select
                value={productData.published ? "TRUE" : "FALSE"}
                disabled={!editable}
                onValueChange={(v) =>
                  applyBatchUpdate((b) => {
                    b.shopify_published = v === "TRUE";
                  })
                }>
                <SelectTrigger className={cn(fieldClass, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRUE">TRUE</SelectItem>
                  <SelectItem value="FALSE">FALSE</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
          </div>
        </div>

        {/* RIGHT column — single panel */}
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Gender</span>
              {genderToolbar ? (
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  {genderToolbar}
                </div>
              ) : null}
            </div>
            {editable ? (
              <GenderRadioField
                variant="segmented"
                name="compact-product-gender"
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

          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
            <FieldShell label="Size">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Select"
                  selectionMode="single"
                  options={catalog.size}
                  values={sizeDisplayValues.slice(0, 1)}
                  onValuesChange={onSizeChange}
                />
              ) : (
                <ReadValue>
                  {sizeDisplayText}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Brand">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Select"
                  selectionMode="single"
                  options={catalog.brand}
                  values={brandValues(productData).slice(0, 1)}
                  onValuesChange={(vals) =>
                    applyBatchUpdate((b) => {
                      ensureNestedObject(b, "product_details").brand =
                        joinMultiValues(vals.slice(-1));
                    })
                  }
                />
              ) : (
                <ReadValue>
                  {displayMultiValue(productData.details.brand)}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Condition">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Select"
                  selectionMode="single"
                  options={catalog.condition}
                  values={conditionValues(productData).slice(0, 1)}
                  onValuesChange={(vals) => {
                    const joined = joinMultiValues(vals.slice(-1));
                    applyBatchUpdate((b) => {
                      b.product_condition = joined;
                      ensureNestedObject(b, "product_details").condition =
                        joined;
                    });
                  }}
                />
              ) : (
                <ReadValue>
                  {displayMultiValue(productData.productCondition)}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Fabric">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Select fabrics"
                  options={catalog.fabric}
                  values={fabricValues(productData, fabricPending)}
                  onValuesChange={onFabricChange}
                />
              ) : (
                <ReadValue>
                  {fabricPending
                    ? "—"
                    : displayMultiValue(productData.metafields.fabric)}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Color">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Select colors"
                  options={catalog.color}
                  values={colorValues(productData)}
                  onValuesChange={(vals) => {
                    const joined = joinMultiValues(vals);
                    applyBatchUpdate((b) => {
                      b.selected_color = joined;
                      ensureNestedObject(b, "variant_data").colors = vals;
                    });
                  }}
                />
              ) : (
                <ReadValue>
                  {displayMultiValue(productData.selectedColor)}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Feature">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Select"
                  options={catalog.feature}
                  values={featureValues(productData, featurePending)}
                  onValuesChange={onFeatureChange}
                />
              ) : (
                <ReadValue>
                  {featurePending
                    ? "—"
                    : displayMultiValue(productData.variants.feature)}
                </ReadValue>
              )}
            </FieldShell>
          </div>

          {/* Measurements — 2-col label | input+cm with row dividers */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              {DIM_FIELDS.map(([label, base, mfKey], idx) => {
                const rawShown =
                  productData.metafields[
                    mfKey as keyof typeof productData.metafields
                  ];
                const displayValue = isZeroOrEmptyDim(rawShown)
                  ? ""
                  : String(rawShown ?? "").replace(/\s*cm$/i, "");
                const rawInput = getDimInputValue(dimensions, base);
                const inputValue = isZeroOrEmptyDim(rawInput)
                  ? ""
                  : rawInput;
                const row = Math.floor(idx / 2);

                return (
                  <div
                    key={base}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2",
                      idx % 2 === 1 && "sm:border-l sm:border-slate-100",
                      row > 0 && "border-t border-slate-100",
                    )}>
                    <span className="w-[46%] shrink-0 truncate text-xs text-slate-600">
                      {label}
                    </span>
                    {editable ? (
                      <div className="relative min-w-0 flex-1 ">
                        <input
                          type="text"
                          inputMode="text"
                          value={inputValue}
                          onChange={(e) =>
                            applyBatchUpdate((b) => {
                              setDimInputValue(b, base, e.target.value);
                            })
                          }
                          className={cn(
                            fieldClass,
                            "h-8 pr-8 text-right text-xs",
                          )}
                          placeholder=""
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400">
                          cm
                        </span>
                      </div>
                    ) : (
                      <p className="min-w-0 flex-1 text-right text-xs text-slate-900">
                        {displayValue ? `${displayValue} cm` : "—"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldShell label="Price*">
              <input
                type="text"
                value={price}
                readOnly={!editable}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder="0,00 zł"
                className={cn(
                  fieldClass,
                  !price.trim() &&
                    "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100",
                )}
              />
            </FieldShell>
            <FieldShell label="SKU*">
              <input
                type="text"
                value={sku}
                readOnly={!editable}
                onChange={(e) => onSkuChange(e.target.value)}
                placeholder="Enter here"
                className={cn(
                  fieldClass,
                  !sku.trim() &&
                    "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100",
                )}
              />
            </FieldShell>
            <FieldShell label="Product Code">
              <input
                type="text"
                value={
                  productData.metafields.productCode === "—"
                    ? ""
                    : productData.metafields.productCode
                }
                readOnly={!editable}
                onChange={(e) =>
                  applyBatchUpdate((b) => {
                    b.product_code = e.target.value;
                  })
                }
                placeholder="—"
                className={fieldClass}
              />
            </FieldShell>
          </div>

          {footer ? (
            <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto">
              {footer}
            </div>
          ) : null}

          {footer && missingPublishFields > 0 ? (
            <p className="text-center text-xs text-slate-500">
              Fill in{" "}
              <span className="font-semibold text-rose-500">
                {missingPublishFields}
              </span>{" "}
              field{missingPublishFields === 1 ? "" : "s"} to publish
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldShell label="Rozmiar">
              {editable ? (
                <SearchableMultiSelect
                  className={multiFieldClass}
                  placeholder="Size"
                  selectionMode="single"
                  options={catalog.size}
                  values={sizeDisplayValues.slice(0, 1)}
                  onValuesChange={onSizeChange}
                />
              ) : (
                <ReadValue>
                  {sizeDisplayText}
                </ReadValue>
              )}
            </FieldShell>
            <FieldShell label="Google condition">
              {editable ? (
                <SearchableSelect
                  className={fieldClass}
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
              ) : (
                <ReadValue>
                  {normalizeGoogleCondition(productData.variants.condition)}
                </ReadValue>
              )}
            </FieldShell>
          </div>
        </div>
      </div>
    </div>
  );
}
