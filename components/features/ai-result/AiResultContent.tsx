"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { CsvDownloadMenu } from "@/components/features/ai-result/CsvDownloadMenu";
import { CsvShopifyUploadMenu } from "@/components/features/ai-result/CsvShopifyUploadMenu";
import {
  DEFAULT_SHOPIFY_PUBLISHED,
  DEFAULT_SHOPIFY_STATUS,
} from "@/lib/shopify-field-options";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth-session";
import { useUpdateDocumentMutation } from "@/lib/api/documentApi";
import { useGetModelPositionQuery } from "@/lib/api/modelPositionApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { CompactProductEditor } from "@/components/features/product-listing/CompactProductEditor";
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
      category: "Women â€º Dresses",
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
      hipWidth: "â€”",
      collarCircumference: "â€”",
      shoeInsertLength: "â€”",
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
    availableSizesFromDimensions: "â€”",
    dimensionConfidence: "â€”",
    hasRulerReference: "â€”",
    batchItemStatus: "â€”",
    documentId: "â€”",
    catalogProductId: "â€”",
    aiRunStatus: "â€”",
    aiRunMessage: "",
    productCondition: "Bardzo dobry",
    published: DEFAULT_SHOPIFY_PUBLISHED,
    shopifyStatus: DEFAULT_SHOPIFY_STATUS,
    selectedSize: "M",
    selectedColor: "Szary",
    weightGrams: "100",
    inventoryQty: "1",
};

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
  const { data: modelPositionRes } = useGetModelPositionQuery();
  const modelPositions = modelPositionRes?.data?.position ?? null;

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
    // UI tab order (Image 1 â†’ 0, Image 5 â†’ 4) maps to POST `generatedImageId` array index.
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
      // PATCH /documents/{generatedImageIds[tabIndex]} â€” imageDetails = batch row + sku/price inside same object.
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
          modelPositions,
        )
      : FALLBACK_PRODUCT_DATA;

  const hasStoredDocument = Boolean(localPayload?.document?.id);
  const canEdit = hasStoredDocument && batches.length > 0;

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
      else setSelectedImage(0);
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
        modelPositions,
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
  }, [batches, localPayload?.document, modelPositions, skuByTab, priceByTab]);

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
    <div className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
        {/* Batch tabs */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="flex min-w-max items-center sm:min-w-0">
            {Array.from({ length: tabCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setActiveTab(index);
                  setSelectedImage(0);
                }}
                className={`relative w-full whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  safeActiveTab === index
                    ? "border-b-2 border-[#A825C7] text-gray-900"
                    : "text-[#61758A] hover:text-gray-700"
                }`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="hidden sm:inline">Image {index + 1}</span>
                  <span className="sm:hidden">{index + 1}</span>
                  {isEditingByTab[index] ? (
                    <span className="rounded bg-purple-50 px-1 py-0.5 text-[10px] font-medium text-[#A825C7]">
                      edit
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium sm:text-sm">
              {sku && price
                ? "Ready for publishing"
                : "Complete SKU and price to publish"}
            </span>
          </div>
          {canEdit && !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-gray-200 text-gray-700"
              onClick={beginEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
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

        <CompactProductEditor
          className="w-full"
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
          onBatchUpdate={(updater) => applyBatchUpdate(safeActiveTab, updater)}
          selectedImage={safeSelectedImage}
          onSelectedImageChange={setSelectedImage}
          onImagesReorder={handleImageReorder}
          documentId={localPayload?.document?.id}
          awaitFabricFeatureSelection
          footer={
            <>
              <CsvDownloadMenu
                entries={csvEntries}
                activeTabIndex={safeActiveTab}
                variant="outline"
                className="h-10 shrink-0"
              />
              <CsvShopifyUploadMenu
                entries={csvEntries}
                activeTabIndex={safeActiveTab}
                variant="outline"
                className="h-10 shrink-0"
              />
              {isEditing ? (
                <>
                  <button
                    type="button"
                    disabled={isUpdatingDocument || isSavingCsv}
                    onClick={() => void handleUpdateAndSave()}
                    className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#A825C7] px-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50">
                    {isUpdatingDocument || isSavingCsv ? (
                      <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        {isUpdatingDocument ? "Updating…" : "Saving…"}
                      </>
                    ) : (
                      "Save & publish"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingDocument || isSavingCsv}
                    onClick={cancelEdit}
                    className="inline-flex h-10 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-[#c81e5b] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#a9184c] disabled:opacity-50">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleSaveToDrive()}
                    disabled={isSavingCsv}
                    className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#A825C7] px-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50">
                    {isSavingCsv ? "Saving..." : "Save & publish"}
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={beginEdit}
                      className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                      <Pencil className="h-4 w-4 shrink-0" />
                      Edit
                    </button>
                  ) : null}
                </>
              )}
            </>
          }
        />
      </div>
    </div>
  );
};

export default AiResultContent;
