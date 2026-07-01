"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, CheckCircle, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  getGeneratedImageIdsForDocument,
  loadGeneratedDocument,
  saveGeneratedDocument,
  type StoredGeneratedPayload,
} from "@/lib/generated-document-storage";
import {
  buildImageDetailsPatchPayload,
  ensureShopifyExportFieldsOnPatch,
  generatedImageIdForTabIndex,
  isPatchRowUpdateResponse,
  mergeParentDocumentWithPatchRow,
  normalizeDocumentApiData,
  replaceGeneratedImageIdAtTabIndex,
} from "@/lib/document-api-helpers";
import {
  deepClonePayload,
  ensureNestedObject,
  getDimInputValue,
  parseListFromDelimited,
  parsePriceForApi,
  restoreImagesBatchTabFromSnapshot,
  setDimInputValue,
  skuPriceMapsFromDocument,
  type ImageBatchRow,
} from "@/lib/ai-result-document-helpers";
import {
  extractImagesBatchFromDocument,
  mapBatchItemToProductListingData,
  type ProductListingData,
} from "@/lib/map-document-to-product-listing";
import { buildShopifyProductImportCsv } from "@/lib/csv/shopify-product-csv";
import {
  DEFAULT_SHOPIFY_PUBLISHED,
  DEFAULT_SHOPIFY_STATUS,
  GOOGLE_CONDITION_OPTIONS,
  STATUS_OPTIONS,
  displayFieldValue,
  normalizeGoogleCondition,
} from "@/lib/shopify-field-options";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import {
  displayGenderLabel,
  readGenerationLanguage,
  type OutputLanguage,
} from "@/lib/feature-catalog";
import { useFeatureCatalogOptions } from "@/lib/hooks/useFeatureCatalogOptions";
import { OptionLanguageSelect } from "@/components/features/ai-result/OptionLanguageSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth-session";
import { useUpdateDocumentMutation } from "@/lib/api/documentApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import {
  EditableInlineField,
  EditableTextBlock,
} from "@/components/features/ai-result/EditableTextBlock";

/** Shown when nothing is stored in localStorage yet. */
const FALLBACK_PRODUCT_DATA: ProductListingData = {
    title: "Women's Floral Summer Dress",
    description:
      "A lightweight, breathable floral dress designed for everyday comfort and casual outings. Made with soft fabric that ensures ease of movement and a flattering fit.",
    mainImage:
      "",
    images: [
      {
        url: "",
        label: "Background removed",
        sku: "SKU-000123456_1",
      },
      {
        url: "",
        label: "On-Model Visualization",
        sku: "SKU-000123456_2",
      },
      {
        url: "",
        label: "Measurement Diagram",
        sku: "SKU-000123456_3",
      },
    ],
    details: {
      category: "Women › Dresses",
      brand: "Local Designer",
      sleeveLength: "Short",
      dressType: "A-line",
      ageGroup: "18-35",
      gender: "Female",
    },
    variants: {
      sizes: ["S", "M", "L", "XL"],
      colors: ["Blue", "Pink"],
      condition: "used",
      feature: "Floral print",
    },
    metafields: {
      productCode: "DR-1023",
      fabric: "100% Cotton",
      chestWidth: "18 in",
      backLength: "38 in",
      waistWidth: "14 in",
      sleeveLength: "7 in",
      underBust: "13 in",
      dressLength: "40 in",
    },
    storage: {
      googleDriveFolder: "/AutoList/Processed/2026-01-18",
      autoListingStatus: true,
      lastProcessed: "Today at 14:32",
    },
    tags: ["vintage", "cotton", "casual", "summer", "unisex"],
    sku: "",
    price: "",
    keyFeatures: [],
    selectedFeatures: [],
    availableSizesFromDimensions: "—",
    dimensionConfidence: "—",
    hasRulerReference: "—",
    batchItemStatus: "—",
    documentId: "—",
    catalogProductId: "—",
    aiRunStatus: "—",
    aiRunMessage: "",
    productCondition: "Bardzo dobry",
    published: DEFAULT_SHOPIFY_PUBLISHED,
    shopifyStatus: DEFAULT_SHOPIFY_STATUS,
    selectedSize: "M",
    selectedColor: "Szary",
    weightGrams: "100",
    inventoryQty: "1",
};

const skuPriceInputClass =
  "w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";

const AiResultContent: React.FC = () => {
  const [localPayload, setLocalPayload] =
    useState<StoredGeneratedPayload | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [skuByTab, setSkuByTab] = useState<Record<number, string>>({});
  const [priceByTab, setPriceByTab] = useState<Record<number, string>>({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSavingCsv, setIsSavingCsv] = useState(false);
  const [isEditingByTab, setIsEditingByTab] = useState<Record<number, boolean>>(
    {},
  );
  const editSnapshotByTabRef = useRef<
    Record<number, StoredGeneratedPayload | null>
  >({});

  const [updateDocument, { isLoading: isUpdatingDocument }] =
    useUpdateDocumentMutation();
  const [optionsLanguage, setOptionsLanguage] = useState<OutputLanguage>(() =>
    readGenerationLanguage(),
  );

  useEffect(() => {
    const loaded = loadGeneratedDocument();
    setLocalPayload(loaded);
    if (loaded?.outputLanguage) {
      setOptionsLanguage(loaded.outputLanguage);
    } else {
      setOptionsLanguage(readGenerationLanguage());
    }
    if (loaded?.document) {
      const { skuByTab: s, priceByTab: p } = skuPriceMapsFromDocument(
        loaded.document,
      );
      setSkuByTab(s);
      setPriceByTab(p);
    }
  }, []);

  const applyBatchUpdate = useCallback(
    (tabIndex: number, updater: (batch: ImageBatchRow) => void) => {
      setLocalPayload((prev) => {
        if (!prev) return prev;
        const next = deepClonePayload(prev);
        const rows = extractImagesBatchFromDocument(next.document);
        const row = rows[tabIndex];
        if (row) updater(row);
        return next;
      });
    },
    [],
  );

  const beginEdit = () => {
    if (!localPayload?.document) return;
    const rows = extractImagesBatchFromDocument(localPayload.document);
    const t = rows.length > 0 ? Math.min(activeTab, rows.length - 1) : 0;
    editSnapshotByTabRef.current[t] = deepClonePayload(localPayload);
    setIsEditingByTab((prev) => ({ ...prev, [t]: true }));
  };

  const cancelEdit = () => {
    if (!localPayload?.document) return;
    const rows = extractImagesBatchFromDocument(localPayload.document);
    const t = rows.length > 0 ? Math.min(activeTab, rows.length - 1) : 0;
    const snap = editSnapshotByTabRef.current[t];
    if (snap) {
      setLocalPayload((cur) => {
        if (!cur) return snap;
        return restoreImagesBatchTabFromSnapshot(cur, snap, t);
      });
      const snapRows = extractImagesBatchFromDocument(snap.document);
      const row = snapRows[t] as Record<string, unknown> | undefined;
      setSkuByTab((prev) => ({
        ...prev,
        [t]: row?.sku != null ? String(row.sku) : "",
      }));
      setPriceByTab((prev) => ({
        ...prev,
        [t]: row?.price != null ? String(row.price) : "",
      }));
    }
    setIsEditingByTab((prev) => ({ ...prev, [t]: false }));
    editSnapshotByTabRef.current[t] = null;
  };

  const handleUpdateDocument = async () => {
    if (!localPayload?.document?.id) {
      toast.error("No document to update.");
      return;
    }
    const doc = deepClonePayload(localPayload).document;
    const aiRaw = doc.aiGenerated;
    if (aiRaw == null || typeof aiRaw !== "object") {
      toast.error("Invalid AI payload.");
      return;
    }
    const batchesForPatch = extractImagesBatchFromDocument(doc);
    const tabCountForPatch = batchesForPatch.length;
    // UI tab order (Image 1 → 0, Image 5 → 4) maps to POST `generatedImageId` array index.
    const activeTabForPatch =
      tabCountForPatch > 0 ? Math.min(activeTab, tabCountForPatch - 1) : 0;
    const idsForPatch = getGeneratedImageIdsForDocument(doc.id, localPayload);
    const patchGeneratedImageId = generatedImageIdForTabIndex(
      idsForPatch,
      activeTabForPatch,
    );
    if (!patchGeneratedImageId) {
      toast.error(
        "Missing per-image ids for this document. Generate again or reload this page.",
      );
      return;
    }
    if (patchGeneratedImageId === doc.id) {
      toast.error(
        "Invalid PATCH target: image id matches document id. Check API payload storage.",
      );
      return;
    }
    const activeRowForPatch = batchesForPatch[activeTabForPatch] as
      | ImageBatchRow
      | undefined;
    if (!activeRowForPatch || typeof activeRowForPatch !== "object") {
      toast.error("No images_batch row for this tab.");
      return;
    }
    const imageDetails = buildImageDetailsPatchPayload(
      activeRowForPatch as Record<string, unknown>,
    );
    if (!imageDetails) {
      toast.error("This row has no valid images_batch image_index.");
      return;
    }
    const skuTrim = (skuByTab[activeTabForPatch] ?? "").trim();
    const priceForApi = parsePriceForApi(priceByTab[activeTabForPatch] ?? "");
    const imageDetailsPayload = ensureShopifyExportFieldsOnPatch({
      ...imageDetails,
      ...(skuTrim ? { sku: skuTrim } : {}),
      ...(priceForApi !== undefined ? { price: priceForApi } : {}),
    });
    try {
      // PATCH /documents/{generatedImageIds[tabIndex]} — imageDetails = batch row + sku/price inside same object.
      const res = await updateDocument({
        id: patchGeneratedImageId,
        body: { imageDetails: imageDetailsPayload },
      }).unwrap();
      if (res.data) {
        if (isPatchRowUpdateResponse(res.data)) {
          const mergedDoc = mergeParentDocumentWithPatchRow(
            doc,
            res.data.imageDetails,
            activeTabForPatch,
          );
          const mergedIds = replaceGeneratedImageIdAtTabIndex(
            localPayload.generatedImageIds,
            activeTabForPatch,
            res.data.id,
          );
          saveGeneratedDocument(mergedDoc, mergedIds);
          setLocalPayload({
            savedAt: new Date().toISOString(),
            document: mergedDoc,
            ...(mergedIds.length ? { generatedImageIds: mergedIds } : {}),
          });
          const det = res.data.imageDetails;
          setSkuByTab((prev) => ({
            ...prev,
            [activeTabForPatch]:
              det.sku != null ? String(det.sku) : "",
          }));
          setPriceByTab((prev) => ({
            ...prev,
            [activeTabForPatch]:
              det.price != null ? String(det.price) : "",
          }));
          setIsEditingByTab((prev) => ({
            ...prev,
            [activeTabForPatch]: false,
          }));
          editSnapshotByTabRef.current[activeTabForPatch] = null;
        } else {
          try {
            const { document: nextDoc, generatedImageIds: nextIds } =
              normalizeDocumentApiData(res.data);
            const mergedIds =
              nextIds.length > 0
                ? nextIds
                : (localPayload.generatedImageIds ?? []);
            saveGeneratedDocument(nextDoc, mergedIds);
            setLocalPayload({
              savedAt: new Date().toISOString(),
              document: nextDoc,
              ...(mergedIds.length ? { generatedImageIds: mergedIds } : {}),
            });
            const maps = skuPriceMapsFromDocument(nextDoc);
            setSkuByTab(maps.skuByTab);
            setPriceByTab(maps.priceByTab);
            setIsEditingByTab({});
            editSnapshotByTabRef.current = {};
          } catch {
            toast.error("Could not apply update response.");
          }
        }
      }
      toast.success(res.message || "Document updated.");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const batches = localPayload?.document
    ? extractImagesBatchFromDocument(localPayload.document)
    : [];

  const tabCount =
    batches.length > 0 ? batches.length : FALLBACK_PRODUCT_DATA.images.length;

  const safeActiveTab =
    tabCount > 0 ? Math.min(activeTab, tabCount - 1) : 0;

  const sku = skuByTab[safeActiveTab] ?? "";
  const price = priceByTab[safeActiveTab] ?? "";
  const isEditing = isEditingByTab[safeActiveTab] ?? false;
  const { catalog } = useFeatureCatalogOptions(optionsLanguage);

  const productData =
    batches.length > 0 && batches[safeActiveTab]
      ? mapBatchItemToProductListingData(
          batches[safeActiveTab],
          localPayload?.document ?? null,
        )
      : FALLBACK_PRODUCT_DATA;

  const hasStoredDocument = Boolean(localPayload?.document?.id);
  const canEdit = hasStoredDocument && batches.length > 0;

  const showSkuPriceSection =
    canEdit ||
    isEditing ||
    sku.trim().length > 0 ||
    price.trim().length > 0;

  const activeBatch = batches[safeActiveTab] as ImageBatchRow | undefined;
  const dimensions =
    activeBatch?.dimensions &&
    typeof activeBatch.dimensions === "object"
      ? (activeBatch.dimensions as Record<string, unknown>)
      : undefined;

  const maxImageIndex = Math.max(0, productData.images.length - 1);
  const safeSelectedImage = Math.min(selectedImage, maxImageIndex);

  const buildActiveTabCsv = () =>
    buildShopifyProductImportCsv(productData, {
      sku,
      price,
      published: productData.published,
      shopifyStatus: productData.shopifyStatus,
      includeBom: true,
    });

  const safeCsvTitle = () => {
    const base =
      (productData.title && productData.title !== "—" ? productData.title : "") ||
      `Doc-${safeActiveTab + 1}`;
    return base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
  };

  const handleDownload = () => {
    const csv = buildActiveTabCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeCsvTitle()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToDrive = async () => {
    if (isSavingCsv) return;
    setIsSavingCsv(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";
      const csv = buildActiveTabCsv();
      const file = new File([csv], `${safeCsvTitle()}.csv`, {
        type: "text/csv;charset=utf-8",
      });

      const form = new FormData();
      form.append("csvFile", file);
      form.append("bodyData", JSON.stringify({ title: productData.title || safeCsvTitle() }));

      const res = await fetch(`${baseUrl}/file-save/save-csv-to-s3`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save CSV");
      }

      toast.success(json?.message || "CSV saved successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save CSV";
      toast.error(msg);
    } finally {
      setIsSavingCsv(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        {batches.length > 0 && productData.aiRunMessage && (
          <div className="mb-4 rounded-xl border border-purple-100 bg-[#F9F1FB] px-4 py-3 text-sm text-gray-800">
            <p className="font-medium text-[#A825C7]">
              AI: {productData.aiRunStatus}
            </p>
            <p className="mt-1 text-gray-600">{productData.aiRunMessage}</p>
            <p className="mt-2 text-xs text-gray-500">
              Document{" "}
              <span className="font-mono">{productData.documentId}</span>
              {productData.catalogProductId !== "—" && (
                <>
                  {" "}
                  · Product{" "}
                  <span className="font-mono">{productData.catalogProductId}</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* Image Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max sm:min-w-0">
            {Array.from({ length: tabCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setActiveTab(index);
                  if (batches.length > 0) {
                    setSelectedImage(0);
                  } else {
                    setSelectedImage(
                      Math.min(
                        index,
                        Math.max(0, productData.images.length - 1),
                      ),
                    );
                  }
                }}
                className={`px-3 sm:px-4 md:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors relative w-full ${
                  safeActiveTab === index
                    ? "text-gray-900 border-b-3 border-[#A825C7]"
                    : "text-[#61758A] hover:text-gray-700 hover:border-b-3 border-[#A825C7]/40"
                }`}>
                <span className="inline-flex items-center gap-1 sm:gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="sm:w-5 sm:h-5">
                    <path
                      d="M15.8333 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5Z"
                      stroke="#61758A"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7.50065 9.16634C8.42113 9.16634 9.16732 8.42015 9.16732 7.49967C9.16732 6.5792 8.42113 5.83301 7.50065 5.83301C6.58018 5.83301 5.83398 6.5792 5.83398 7.49967C5.83398 8.42015 6.58018 9.16634 7.50065 9.16634Z"
                      stroke="#61758A"
                      strokeWidth="1.66667"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17.5 12.5001L14.9283 9.92841C14.6158 9.61595 14.1919 9.44043 13.75 9.44043C13.3081 9.44043 12.8842 9.61595 12.5717 9.92841L5 17.5001"
                      stroke="#61758A"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Image {index + 1}</span>
                  <span className="sm:hidden">{index + 1}</span>
                  {isEditingByTab[index] ? (
                    <span className="ml-1 rounded bg-purple-50 px-1 py-0.5 text-[10px] font-medium text-[#A825C7]">
                      edit
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 py-4 sm:py-6 lg:py-8">
          {/* Left Column - Image Outputs */}
          <div className="col-span-1 lg:col-span-2">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
              Image Outputs
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {productData.images.map((image, index) => (
                <div
                  key={`${image.url}-${index}`}
                  className={`bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    safeSelectedImage === index ? "ring-2 ring-[#A825C7]" : ""
                  }`}
                  onClick={() => setSelectedImage(index)}>
                  <div className="relative w-full aspect-3/4 min-h-[220px] sm:min-h-[280px] bg-gray-100">
                    <Image
                      src={image.url}
                      alt={image.label}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={index === 0}
                      unoptimized={
                        image.url.includes("amazonaws.com") ||
                        image.url.startsWith("http://")
                      }
                    />
                  </div>
                  <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 border-t border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {image.label}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-400">
                      {image.sku}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-4 sm:space-y-6 col-span-1 lg:col-span-3">
            {/* Product Listing Preview */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                    Product Listing Preview
                  </h2>
                  {canEdit && !isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-gray-200 text-gray-700"
                      onClick={beginEdit}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-gray-200 text-gray-700"
                        disabled={isUpdatingDocument}
                        onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 bg-[#A825C7] hover:bg-purple-600 text-white"
                        disabled={isUpdatingDocument}
                        onClick={handleUpdateDocument}>
                        {isUpdatingDocument ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Update"
                        )}
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">
                    {sku && price
                      ? "Ready for publishing"
                      : "Complete SKU and price to publish"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <EditableTextBlock
                  label="Product Title"
                  editing={isEditing}
                  variant="title"
                  value={productData.title}
                  onChange={(v) =>
                    applyBatchUpdate(safeActiveTab, (b) => {
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
                    applyBatchUpdate(safeActiveTab, (b) => {
                      b.description = v;
                      ensureNestedObject(b, "listing").description = v;
                    })
                  }
                />

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Media
                  </label>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {productData.images.length} outputs • Selected:{" "}
                    {productData.images[safeSelectedImage]?.label ?? "—"}
                  </p>
                </div>

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

                {((isEditing && canEdit) ||
                  productData.keyFeatures.length > 0) &&
                  (isEditing ? (
                    <EditableTextBlock
                      label="Key features (one per line)"
                      editing
                      multiline
                      rows={6}
                      value={productData.keyFeatures.join("\n")}
                      onChange={(v) =>
                        applyBatchUpdate(safeActiveTab, (b) => {
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

                {productData.batchItemStatus !== "—" && (
                  <p className="text-xs text-gray-500">
                    Batch item status:{" "}
                    <span className="font-medium text-gray-800">
                      {productData.batchItemStatus}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Sizing & measurement */}
            {((isEditing && canEdit) ||
              productData.selectedSize !== "—") && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
                  Sizing & measurement
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 block mb-1">Size</span>
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
                          applyBatchUpdate(safeActiveTab, (b) => {
                            const d = ensureNestedObject(b, "dimensions");
                            d.selected_size = v;
                            d.available_sizes = [v];
                            const vd = ensureNestedObject(b, "variant_data");
                            vd.sizes = [v];
                          })
                        }
                      />
                    ) : (
                      <p className="text-gray-900 mt-0.5">
                        {productData.selectedSize}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Product Details and Metafields */}
            {isEditing && canEdit && (
              <div className="flex justify-end">
                <OptionLanguageSelect
                  value={optionsLanguage}
                  onChange={setOptionsLanguage}
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
                  Product Details
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <span className="text-gray-500 block mb-1 text-xs">
                      Category
                    </span>
                    {isEditing && canEdit ? (
                      <SearchableSelect
                        className={skuPriceInputClass}
                        placeholder="Select category"
                        options={catalog.category}
                        value={displayFieldValue(productData.details.category)}
                        onValueChange={(v) =>
                          applyBatchUpdate(safeActiveTab, (b) => {
                            ensureNestedObject(b, "product_details").category =
                              v;
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
                    <span className="text-gray-500 block mb-1 text-xs">
                      Brand
                    </span>
                    {isEditing && canEdit ? (
                      <SearchableSelect
                        className={skuPriceInputClass}
                        placeholder="Select brand"
                        options={catalog.brand}
                        value={displayFieldValue(productData.details.brand)}
                        onValueChange={(v) =>
                          applyBatchUpdate(safeActiveTab, (b) => {
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
                          applyBatchUpdate(safeActiveTab, (b) => {
                            b.product_condition = v;
                            ensureNestedObject(b, "product_details").condition =
                              v;
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
                    <span className="text-gray-500 block mb-1 text-xs">
                      Gender
                    </span>
                    {isEditing && canEdit ? (
                      <SearchableSelect
                        className={skuPriceInputClass}
                        placeholder="Select gender"
                        options={catalog.gender}
                        value={displayFieldValue(productData.details.gender)}
                        onValueChange={(v) =>
                          applyBatchUpdate(safeActiveTab, (b) => {
                            ensureNestedObject(b, "product_details").gender = v;
                          })
                        }
                      />
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-900 capitalize">
                        {displayGenderLabel(productData.details.gender) || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Metafields */}
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
                      applyBatchUpdate(safeActiveTab, (b) => {
                        b.product_code = v;
                      })
                    }
                  />
                  <div>
                    <span className="text-gray-500 block mb-1 text-xs">
                      Fabric
                    </span>
                    {isEditing && canEdit ? (
                      <SearchableSelect
                        className={skuPriceInputClass}
                        placeholder="Select fabric"
                        options={catalog.fabric}
                        value={displayFieldValue(productData.metafields.fabric)}
                        onValueChange={(v) =>
                          applyBatchUpdate(safeActiveTab, (b) => {
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
                          applyBatchUpdate(safeActiveTab, (b) => {
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

            {/* Variant & Google Data & Tags */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
                  Variant & Google Data
                </h3>
                <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-2 sm:gap-y-3">
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
                            applyBatchUpdate(safeActiveTab, (b) => {
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
                            applyBatchUpdate(safeActiveTab, (b) => {
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
                            applyBatchUpdate(safeActiveTab, (b) => {
                              ensureNestedObject(b, "variant_data").condition =
                                v;
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
                            applyBatchUpdate(safeActiveTab, (b) => {
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

              {/* Tags */}
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
                      applyBatchUpdate(safeActiveTab, (b) => {
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
                        className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Storage & Automation & SKU and Price  */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Storage & Automation */}
              {/* <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
                  Storage & Automation
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">
                        Google Drive Folder
                      </p>
                      <p className="text-xs sm:text-sm text-gray-900 font-medium break-all">
                        {productData.storage.googleDriveFolder}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">
                      Ready to publish (catalog)
                    </p>
                    <p className="text-xs sm:text-sm text-gray-900 font-medium">
                      {productData.storage.autoListingStatus
                        ? "Yes"
                        : "No"}
                    </p>
                  </div>
                </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">
                        Last Processed
                      </p>
                      <p className="text-xs sm:text-sm text-gray-900 font-medium">
                        {productData.storage.lastProcessed}
                      </p>
                    </div>
                  </div>
                </div>
              </div> */}

              <div className="space-y-3 sm:space-y-4">
                {/* SKU and Price: hidden when both empty and not editing; always visible in edit mode */}
                {showSkuPriceSection && (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={sku}
                        readOnly={!canEdit || !isEditing}
                        onChange={(e) =>
                          setSkuByTab((prev) => ({
                            ...prev,
                            [safeActiveTab]: e.target.value,
                          }))
                        }
                        placeholder="Write here"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
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
                        onChange={(e) =>
                          setPriceByTab((prev) => ({
                            ...prev,
                            [safeActiveTab]: e.target.value,
                          }))
                        }
                        placeholder="Write here"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
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
                          disabled={!canEdit}
                          onValueChange={(v) =>
                            applyBatchUpdate(safeActiveTab, (b) => {
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
                          disabled={!canEdit}
                          onValueChange={(v) =>
                            applyBatchUpdate(safeActiveTab, (b) => {
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
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  {/* <Link
                    href={"/analyzing"}
                    className="w-full sm:w-auto flex-shrink-0 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </Link> */}

                  <button
                    onClick={handleDownload}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4  py-2  bg-[#A825C7] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-500 transition-colors">
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    Download
                  </button>

                  <button
                    onClick={handleSaveToDrive}
                    disabled={isSavingCsv}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4  py-2  bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    {/* Save icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} fill="none" viewBox="0 0 24 24">
                      <path
                        d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7.17a2 2 0 011.41.59l2.83 2.83A2 2 0 0120 7.17V19a2 2 0 01-2 2z"
                        stroke="#A825C7"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="#fff"
                      />
                      <path
                        d="M7 21v-4a2 2 0 012-2h6a2 2 0 012 2v4"
                        stroke="#A825C7"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <rect
                        x={9}
                        y={8}
                        width={6}
                        height={4}
                        rx={1}
                        stroke="#A825C7"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        fill="#f3e8fa"
                      />
                    </svg>
                    {isSavingCsv ? "Saving..." : "Save"}
                  </button>

                  {canEdit && !isEditing && (
                    <button
                      type="button"
                      onClick={beginEdit}
                      className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                      Edit
                    </button>
                  )}

                  {isEditing && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdatingDocument}
                        onClick={cancelEdit}
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingDocument}
                        onClick={handleUpdateDocument}
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#A825C7] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50">
                        {isUpdatingDocument ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          "Update"
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiResultContent;
