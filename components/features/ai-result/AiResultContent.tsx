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
  isPatchRowUpdateResponse,
  mergeParentDocumentWithPatchRow,
  normalizeDocumentApiData,
  replaceGeneratedImageIdAtImageIndex,
  resolveGeneratedImageIdForBatchRow,
  parseBatchImageIndex,
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
import { ShopifyStatusPill } from "@/components/features/shopify/ShopifyStatusPill";
import { ShopifyUploadHistoryDialog } from "@/components/features/shopify/ShopifyUploadHistoryDialog";
import type {
  ShopifyUploadMultipleResponse,
  ShopifyUploadProductResult,
} from "@/lib/api/shopifyApi";
import {
  summarizeProductList,
  uploadResponseProducts,
  statusHint,
  type ShopifyUserStatus,
} from "@/lib/shopify-upload-display";
import {
  loadShopifyStatusByDocument,
  saveShopifyStatusByDocument,
  type StoredShopifyByTab,
} from "@/lib/shopify-status-storage";
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
import {
  stripAiAutoSizeFromPayload,
  stripAiFabricFeatureFromPayload,
} from "@/lib/fabric-feature-pending";
import { cn } from "@/lib/utils";

/** Normalize AI-generated payload for the result editor. */
function prepareResultPayload(
  payload: StoredGeneratedPayload,
): StoredGeneratedPayload {
  return stripAiAutoSizeFromPayload(stripAiFabricFeatureFromPayload(payload));
}

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
      category: "",
      brand: "",
      sleeveLength: "Short",
      dressType: "A-line",
      ageGroup: "18-35",
      gender: "Female",
    },
    variants: {
      sizes: ["—"],
      colors: ["—"],
      condition: "used",
      feature: "—",
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
    selectedSize: "—",
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
  /**
   * Shopify status per Image/group tab — not global,
   * so uploading Image 1 does not show status on Image 2.
   */
  const [shopifyByTab, setShopifyByTab] = useState<StoredShopifyByTab>({});
  const [shopifyHistoryOpen, setShopifyHistoryOpen] = useState(false);
  const [shopifyHistoryIds, setShopifyHistoryIds] = useState<string[]>([]);
  const [shopifyHistoryImmediate, setShopifyHistoryImmediate] = useState<
    ShopifyUploadProductResult[] | undefined
  >(undefined);
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
    const prepared = loaded ? prepareResultPayload(loaded) : null;
    setLocalPayload(prepared);
    if (prepared?.document) {
      const { skuByTab: s, priceByTab: p } = skuPriceMapsFromDocument(
        prepared.document,
      );
      setSkuByTab(s);
      setPriceByTab(p);
      // Restore per-tab Shopify badges after reload
      const saved = loadShopifyStatusByDocument(prepared.document.id);
      setShopifyByTab(saved);
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
    const activeRowForPatch = batchesForPatch[activeTabForPatch] as
      | ImageBatchRow
      | undefined;
    const patchGeneratedImageId = resolveGeneratedImageIdForBatchRow(
      idsForPatch,
      activeRowForPatch,
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
          // Replace id at API image_index (0-based), not just UI tab slot
          const imageIx =
            parseBatchImageIndex(
              res.data.imageDetails as Record<string, unknown>,
            ) ??
            parseBatchImageIndex(activeRowForPatch) ??
            activeTabForPatch;
          const baseIds =
            localPayload.generatedImageIds ??
            getGeneratedImageIdsForDocument(doc.id, localPayload) ??
            [];
          const mergedIds = replaceGeneratedImageIdAtImageIndex(
            baseIds,
            imageIx,
            res.data.id,
          );
          const nextPayload: StoredGeneratedPayload = {
            savedAt: new Date().toISOString(),
            document: mergedDoc,
            ...(mergedIds.length ? { generatedImageIds: mergedIds } : {}),
          };
          const stripped = prepareResultPayload(nextPayload);
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
            const stripped = prepareResultPayload(nextPayload);
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
    const ids =
      localPayload.generatedImageIds ??
      getGeneratedImageIdsForDocument(localPayload.document.id, localPayload) ??
      [];
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
        // Prefer row-linked / image_index mapping — not raw index only
        generatedImageId: resolveGeneratedImageIdForBatchRow(
          ids,
          batch as Record<string, unknown>,
          index,
        ),
      };
    });
  }, [
    batches,
    localPayload,
    modelPositions,
    skuByTab,
    priceByTab,
  ]);

  /** Rebuild CSV entries from localStorage (sync) after save/PATCH so ids match product. */
  const rebuildCsvEntriesFromStorage = useCallback(
    (selected: TabCsvEntry[]): TabCsvEntry[] => {
      const stored = loadGeneratedDocument();
      if (!stored?.document) return selected;
      const rows = extractImagesBatchFromDocument(stored.document);
      const ids =
        stored.generatedImageIds ??
        getGeneratedImageIdsForDocument(stored.document.id, stored) ??
        [];
      const byIndex = new Map(
        selected.map((s) => [s.index, s] as const),
      );
      const fresh: TabCsvEntry[] = [];
      for (const sel of selected) {
        const batch = rows[sel.index] as Record<string, unknown> | undefined;
        if (!batch) {
          fresh.push(sel);
          continue;
        }
        const data = mapBatchItemToProductListingData(
          batch,
          stored.document,
          modelPositions,
        );
        fresh.push({
          index: sel.index,
          product: data,
          opts: {
            sku: skuByTab[sel.index] ?? byIndex.get(sel.index)?.opts.sku ?? "",
            price:
              priceByTab[sel.index] ?? byIndex.get(sel.index)?.opts.price ?? "",
            published: data.published,
            shopifyStatus: data.shopifyStatus,
          },
          generatedImageId: resolveGeneratedImageIdForBatchRow(
            ids,
            batch,
            sel.index,
          ),
        });
      }
      return fresh;
    },
    [modelPositions, skuByTab, priceByTab],
  );

  const handleSaveBeforeShopifyUpload = async (
    items: TabCsvEntry[],
  ): Promise<boolean | TabCsvEntry[]> => {
    if (isUpdatingDocument || isSavingCsv) return false;
    if (isEditing) {
      const updated = await handleUpdateDocument();
      if (!updated) return false;
    }
    // Drive save is best-effort for ai-result footer; don't block Shopify if CSV already correct
    try {
      await handleSaveToDrive();
    } catch {
      /* continue with Shopify even if S3 save fails after toast */
    }
    return rebuildCsvEntriesFromStorage(items);
  };

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

  const handleShopifyUploadComplete = (
    res: ShopifyUploadMultipleResponse,
    meta: { generatedImageIds: string[]; tabIndexes: number[] },
  ) => {
    const products = uploadResponseProducts(res);
    setShopifyByTab((prev) => {
      const next: StoredShopifyByTab = { ...prev };
      const tabs = meta.tabIndexes.length
        ? meta.tabIndexes
        : products.map((_, i) => i);

      tabs.forEach((tabIdx, i) => {
        const product = products[i];
        const slice = product ? [product] : products;
        const status = summarizeProductList(slice);
        const idAt =
          meta.generatedImageIds[i] ??
          meta.generatedImageIds.find(Boolean);
        next[tabIdx] = {
          status: status === "none" ? "success" : status,
          immediateResults: slice,
          generatedImageIds: idAt
            ? [idAt]
            : meta.generatedImageIds.filter(Boolean),
          updatedAt: new Date().toISOString(),
        };
      });

      const docId = localPayload?.document?.id;
      if (docId) {
        saveShopifyStatusByDocument(docId, next);
      }
      return next;
    });
  };

  const activeShopify = shopifyByTab[safeActiveTab];

  const openShopifyHistoryForCurrent = () => {
    const tabState = shopifyByTab[safeActiveTab];
    const idFromEntry = csvEntries[safeActiveTab]?.generatedImageId?.trim();
    const ids =
      tabState?.generatedImageIds?.length
        ? tabState.generatedImageIds
        : idFromEntry
          ? [idFromEntry]
          : [];
    setShopifyHistoryIds(ids);
    setShopifyHistoryImmediate(tabState?.immediateResults);
    setShopifyHistoryOpen(true);
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
          genderToolbar={
            <>
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium",
                  sku && price ? "text-green-600" : "text-amber-600",
                )}>
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
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
                  className="h-7 shrink-0 border-gray-200 text-gray-700 text-xs"
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
                  className="h-7 shrink-0 border-gray-200 text-gray-700 text-xs"
                  disabled={isUpdatingDocument || isSavingCsv}
                  onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </>
          }
          footer={
            <>
              <CsvDownloadMenu
                entries={csvEntries}
                activeTabIndex={safeActiveTab}
                variant="outline"
                className="h-10 shrink-0"
              />
              <div className="flex shrink-0 items-center gap-2">
                <CsvShopifyUploadMenu
                  entries={csvEntries}
                  activeTabIndex={safeActiveTab}
                  variant="outline"
                  className="h-10 shrink-0"
                  saving={isUpdatingDocument || isSavingCsv}
                  onBeforeUpload={handleSaveBeforeShopifyUpload}
                  onUploadComplete={handleShopifyUploadComplete}
                />
                {activeShopify ? (
                  <div className="hidden min-w-0 flex-col items-start sm:flex">
                    <ShopifyStatusPill
                      status={activeShopify.status}
                      onClick={openShopifyHistoryForCurrent}
                    />
                    <span className="mt-0.5 max-w-[9rem] truncate text-[10px] text-slate-500">
                      Click for details
                    </span>
                  </div>
                ) : null}
              </div>
              {activeShopify ? (
                <div className="flex w-full basis-full items-center justify-between gap-2 sm:hidden">
                  <span className="text-xs text-slate-600">
                    Shopify: {statusHint(activeShopify.status)}
                  </span>
                  <ShopifyStatusPill
                    status={activeShopify.status}
                    onClick={openShopifyHistoryForCurrent}
                  />
                </div>
              ) : null}
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
                      "Save"
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
                    {isSavingCsv ? "Saving..." : "Save"}
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

      <ShopifyUploadHistoryDialog
        open={shopifyHistoryOpen}
        onClose={() => {
          setShopifyHistoryOpen(false);
          setShopifyHistoryImmediate(undefined);
        }}
        generatedImageIds={shopifyHistoryIds}
        immediateResults={shopifyHistoryImmediate}
        heading="Shopify upload status"
      />
    </div>
  );
};

export default AiResultContent;
