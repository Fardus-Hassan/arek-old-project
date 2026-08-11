import type { ShopifyUploadProductResult } from "@/lib/api/shopifyApi";
import type { ShopifyUserStatus } from "@/lib/shopify-upload-display";

const STORAGE_PREFIX = "ajpropl_shopify_upload_status_v1_";

export type StoredTabShopifyStatus = {
  status: ShopifyUserStatus;
  generatedImageIds: string[];
  /** Optional last API product results for instant detail after reload */
  immediateResults?: ShopifyUploadProductResult[];
  updatedAt: string;
};

export type StoredShopifyByTab = Record<number, StoredTabShopifyStatus>;

function storageKey(documentId: string): string {
  return `${STORAGE_PREFIX}${documentId}`;
}

export function loadShopifyStatusByDocument(
  documentId: string,
): StoredShopifyByTab {
  if (typeof window === "undefined" || !documentId) return {};
  try {
    const raw = localStorage.getItem(storageKey(documentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredShopifyByTab;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveShopifyStatusByDocument(
  documentId: string,
  byTab: StoredShopifyByTab,
): void {
  if (typeof window === "undefined" || !documentId) return;
  try {
    localStorage.setItem(storageKey(documentId), JSON.stringify(byTab));
  } catch {
    // ignore quota / private mode
  }
}

/** Merge one or more tab updates and persist. */
export function upsertShopifyStatusTabs(
  documentId: string,
  updates: StoredShopifyByTab,
): StoredShopifyByTab {
  const prev = loadShopifyStatusByDocument(documentId);
  const next: StoredShopifyByTab = { ...prev, ...updates };
  saveShopifyStatusByDocument(documentId, next);
  return next;
}
