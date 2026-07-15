"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Pencil, Loader2 } from "lucide-react";
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
  parsePriceForApi,
  restoreImagesBatchTabFromSnapshot,
  skuPriceMapsFromDocument,
  type ImageBatchRow,
} from "@/lib/ai-result-document-helpers";
import {
  extractImagesBatchFromDocument,
  mapBatchItemToProductListingData,
  type ProductImage,
  type ProductListingData,
} from "@/lib/map-document-to-product-listing";
import { buildShopifyProductImportCsv } from "@/lib/csv/shopify-product-csv";
import {
  safeCsvFilename,
  type TabCsvEntry,
} from "@/lib/download-product-csv";
import { ImageOutputOrderStrip } from "@/components/features/ai-result/ImageOutputOrderStrip";
import { CsvDownloadMenu } from "@/components/features/ai-result/CsvDownloadMenu";
import {
  DEFAULT_SHOPIFY_PUBLISHED,
  DEFAULT_SHOPIFY_STATUS,
  STATUS_OPTIONS,
} from "@/lib/shopify-field-options";
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
  EditableTextBlock,
} from "@/components/features/ai-result/EditableTextBlock";
import { ProductListingPanel } from "@/components/features/product-listing/ProductListingPanel";
import { stripAiFabricFeatureFromPayload } from "@/lib/fabric-feature-pending";

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
      hipWidth: "—",
      collarCircumference: "—",
      shoeInsertLength: "—",
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

  useEffect(() => {
    const loaded = loadGeneratedDocument();
    const prepared = loaded ? stripAiFabricFeatureFromPayload(loaded) : null;
    setLocalPayload(prepared);
    if (prepared?.document) {
      const { skuByTab: s, priceByTab: p } = skuPriceMapsFromDocument(
        prepared.document,
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

  const handleUpdateDocument = async (): Promise<boolean> => {
    if (!localPayload?.document?.id) {
      toast.error("No document to update.");
      return false;
    }
    const doc = deepClonePayload(localPayload).document;
    const aiRaw = doc.aiGenerated;
    if (aiRaw == null || typeof aiRaw !== "object") {
      toast.error("Invalid AI payload.");
      return false;
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
      return false;
    }
    if (patchGeneratedImageId === doc.id) {
      toast.error(
        "Invalid PATCH target: image id matches document id. Check API payload storage.",
      );
      return false;
    }
    const activeRowForPatch = batchesForPatch[activeTabForPatch] as
      | ImageBatchRow
      | undefined;
    if (!activeRowForPatch || typeof activeRowForPatch !== "object") {
      toast.error("No images_batch row for this tab.");
      return false;
    }
    const imageDetails = buildImageDetailsPatchPayload(
      activeRowForPatch as Record<string, unknown>,
    );
    if (!imageDetails) {
      toast.error("This row has no valid images_batch image_index.");
      return false;
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
          const nextPayload: StoredGeneratedPayload = {
            savedAt: new Date().toISOString(),
            document: mergedDoc,
            ...(mergedIds.length ? { generatedImageIds: mergedIds } : {}),
          };
          const stripped = stripAiFabricFeatureFromPayload(nextPayload);
          saveGeneratedDocument(stripped.document, mergedIds);
          setLocalPayload(stripped);
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
            const nextPayload: StoredGeneratedPayload = {
              savedAt: new Date().toISOString(),
              document: nextDoc,
              ...(mergedIds.length ? { generatedImageIds: mergedIds } : {}),
            };
            const stripped = stripAiFabricFeatureFromPayload(nextPayload);
            saveGeneratedDocument(stripped.document, mergedIds);
            setLocalPayload(stripped);
            const maps = skuPriceMapsFromDocument(nextDoc);
            setSkuByTab(maps.skuByTab);
            setPriceByTab(maps.priceByTab);
            setIsEditingByTab({});
            editSnapshotByTabRef.current = {};
          } catch {
            toast.error("Could not apply update response.");
            return false;
          }
        }
      }
      toast.success(res.message || "Document updated.");
      return true;
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
      return false;
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

  const handleImageReorder = (nextImages: ProductImage[]) => {
    const selectedUrl = productData.images[safeSelectedImage]?.url;
    const orderUrls = nextImages.map((img) => img.url).filter(Boolean);

    if (selectedUrl) {
      const newIdx = nextImages.findIndex((img) => img.url === selectedUrl);
      if (newIdx >= 0) setSelectedImage(newIdx);
    }

    setLocalPayload((prev) => {
      if (!prev?.document) return prev;
      const next = deepClonePayload(prev);
      const rows = extractImagesBatchFromDocument(next.document);
      const row = rows[safeActiveTab];
      if (row) row.image_output_order = orderUrls;
      saveGeneratedDocument(next.document, next.generatedImageIds ?? []);
      return next;
    });
  };

  const csvEntries = useMemo((): TabCsvEntry[] => {
    if (!localPayload?.document || batches.length === 0) return [];
    return batches.map((batch, index) => {
      const data = mapBatchItemToProductListingData(
        batch,
        localPayload.document,
      );
      return {
        index,
        product: data,
        opts: {
          sku: skuByTab[index] ?? "",
          price: priceByTab[index] ?? "",
          published: data.published,
          shopifyStatus: data.shopifyStatus,
        },
      };
    });
  }, [batches, localPayload?.document, skuByTab, priceByTab]);

  const buildActiveTabCsv = () =>
    buildShopifyProductImportCsv(productData, {
      sku,
      price,
      published: productData.published,
      shopifyStatus: productData.shopifyStatus,
      includeBom: true,
    });

  const handleSaveToDrive = async (): Promise<boolean> => {
    if (isSavingCsv) return false;
    setIsSavingCsv(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error("Not authenticated");
        return false;
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";
      const csv = buildActiveTabCsv();
      const file = new File([csv], safeCsvFilename(productData.title, safeActiveTab), {
        type: "text/csv;charset=utf-8",
      });

      const form = new FormData();
      form.append("csvFile", file);
      form.append("bodyData", JSON.stringify({ title: productData.title || `Image-${safeActiveTab + 1}` }));

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
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save CSV";
      toast.error(msg);
      return false;
    } finally {
      setIsSavingCsv(false);
    }
  };

  const handleUpdateAndSave = async () => {
    if (isUpdatingDocument || isSavingCsv) return;
    const updated = await handleUpdateDocument();
    if (updated) {
      await handleSaveToDrive();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        {productData.images.length > 0 && (
          <ImageOutputOrderStrip
            images={productData.images}
            selectedIndex={safeSelectedImage}
            onSelect={setSelectedImage}
            onReorder={handleImageReorder}
          />
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-gray-200 text-gray-700"
                      disabled={isUpdatingDocument || isSavingCsv}
                      onClick={cancelEdit}>
                      Cancel
                    </Button>
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

            <ProductListingPanel
              compact
              showImages={false}
              showActionButtons={false}
              showSkuPrice={false}
              showListingSection={false}
              productData={productData}
              isEditing={isEditing}
              canEdit={canEdit}
              dimensions={dimensions}
              sku={sku}
              price={price}
              onSkuChange={(v) =>
                setSkuByTab((prev) => ({ ...prev, [safeActiveTab]: v }))
              }
              onPriceChange={(v) =>
                setPriceByTab((prev) => ({ ...prev, [safeActiveTab]: v }))
              }
              onBatchUpdate={(updater) =>
                applyBatchUpdate(safeActiveTab, updater)
              }
              documentId={localPayload?.document?.id}
              awaitFabricFeatureSelection
            />

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
              </div>
            </div>

            {/* Action Buttons — compact width, readable text */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <CsvDownloadMenu
                entries={csvEntries}
                activeTabIndex={safeActiveTab}
                className="w-auto"
              />

              {isEditing ? (
                <>
                  <button
                    type="button"
                    disabled={isUpdatingDocument || isSavingCsv}
                    onClick={cancelEdit}
                    className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:text-sm">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingDocument || isSavingCsv}
                    onClick={() => void handleUpdateAndSave()}
                    className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#A825C7] px-3 text-xs font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50 sm:gap-2 sm:text-sm">
                    {isUpdatingDocument || isSavingCsv ? (
                      <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        {isUpdatingDocument ? "Updating…" : "Saving…"}
                      </>
                    ) : (
                      "Update & Save"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => void handleSaveToDrive()}
                    disabled={isSavingCsv}
                    className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:gap-2 sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none" viewBox="0 0 24 24" className="shrink-0">
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

                  {canEdit && (
                    <button
                      type="button"
                      onClick={beginEdit}
                      className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:gap-2 sm:text-sm">
                      <Pencil className="h-4 w-4 shrink-0" />
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiResultContent;
