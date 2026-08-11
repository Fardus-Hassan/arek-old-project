import type {
  ShopifyMetafieldResult,
  ShopifySkippedMetafield,
  ShopifyUploadHistoryRecord,
  ShopifyUploadMultipleResponse,
  ShopifyUploadProductResult,
} from "@/lib/api/shopifyApi";

/** Status a non-technical person can read */
export type ShopifyUserStatus = "success" | "failed" | "partial" | "none";

export type ShopifyMetafieldRow = {
  name: string;
  ok: boolean;
  detail?: string;
};

export type ShopifyProductDisplay = {
  status: "success" | "failed";
  title: string;
  handle?: string;
  shopifyProductId?: string;
  adminUrl?: string;
  errorMessage?: string;
  publishOk?: boolean;
  publishMessage?: string;
  metafieldOk: number;
  metafieldFail: number;
  metafieldRows: ShopifyMetafieldRow[];
  skippedCount: number;
  skippedLabels: string[];
};

export type ShopifyHistoryDisplay = {
  id: string;
  status: "success" | "failed";
  title: string;
  when?: string;
  generatedImageId?: string;
  product: ShopifyProductDisplay;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

/** "custom.fabric_type" → "Fabric type" */
export function humanizeFieldKey(raw?: string | null): string {
  if (!raw) return "Field";
  const part = raw.includes(".") ? (raw.split(".").pop() ?? raw) : raw;
  return part
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhen(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function metafieldDetail(m: ShopifyMetafieldResult): string | undefined {
  const err = m.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err != null && typeof err === "object") {
    const r = asRecord(err);
    const msg = firstString(r?.message, r?.error, r?.detail);
    if (msg) return msg;
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }
  if (m.success === false) return "Could not save this field";
  return undefined;
}

function mapMetafields(list?: ShopifyMetafieldResult[]): {
  ok: number;
  fail: number;
  rows: ShopifyMetafieldRow[];
} {
  const rows: ShopifyMetafieldRow[] = [];
  let ok = 0;
  let fail = 0;
  for (const m of list ?? []) {
    const success = m.success !== false;
    if (success) ok += 1;
    else fail += 1;
    const name = humanizeFieldKey(
      firstString(m.key, m.namespace) ?? undefined,
    );
    rows.push({
      name,
      ok: success,
      detail: success ? undefined : metafieldDetail(m),
    });
  }
  return { ok, fail, rows };
}

function mapSkipped(list?: ShopifySkippedMetafield[]): {
  count: number;
  labels: string[];
} {
  const labels: string[] = [];
  for (const s of list ?? []) {
    const name = humanizeFieldKey(firstString(s.key, s.namespace));
    const reason =
      typeof s.reason === "string" && s.reason.trim()
        ? s.reason.trim()
        : undefined;
    labels.push(reason ? `${name} (${reason})` : name);
  }
  return { count: labels.length, labels };
}

export function productResultToDisplay(
  raw: ShopifyUploadProductResult | null | undefined,
): ShopifyProductDisplay {
  const r = raw ?? {};
  const rec = asRecord(r) ?? {};
  const success = r.success !== false && !firstString(r.error, r.errorMessage);
  const publishRaw = r.publish ?? (rec.publish as ShopifyUploadProductResult["publish"]);
  const publish =
    publishRaw && typeof publishRaw === "object"
      ? (publishRaw as { success?: boolean; message?: string })
      : undefined;

  const meta = mapMetafields(r.metafieldResults);
  const skipped = mapSkipped(r.skippedMetafields);

  const errorMessage = firstString(
    r.errorMessage,
    r.error,
    rec.message,
    success ? undefined : "Upload did not complete successfully",
  );

  return {
    status: success ? "success" : "failed",
    title:
      firstString(r.title, r.handle) ??
      "Product",
    handle: firstString(r.handle),
    shopifyProductId: firstString(r.shopifyProductId),
    adminUrl: firstString(r.adminUrl),
    errorMessage: success ? undefined : errorMessage,
    publishOk:
      publish && typeof publish.success === "boolean"
        ? publish.success
        : undefined,
    publishMessage: firstString(publish?.message),
    metafieldOk: meta.ok,
    metafieldFail: meta.fail,
    metafieldRows: meta.rows,
    skippedCount: skipped.count,
    skippedLabels: skipped.labels,
  };
}

/** Merge history row + nested result into one display model */
export function historyRecordToDisplay(
  record: ShopifyUploadHistoryRecord,
): ShopifyHistoryDisplay {
  const nested = record.result
    ? productResultToDisplay(record.result)
    : productResultToDisplay({
        title: firstString(record.title) ?? undefined,
        handle: firstString(record.handle) ?? undefined,
        success: record.success,
        shopifyProductId: record.shopifyProductId,
        adminUrl: firstString(record.adminUrl) ?? undefined,
        errorMessage: firstString(record.errorMessage) ?? undefined,
      });

  const status =
    record.success === false || nested.status === "failed"
      ? "failed"
      : "success";

  return {
    id: record.id,
    status,
    title:
      firstString(record.title, nested.title, record.handle) ?? "Product",
    when: formatWhen(record.createdAt ?? record.updatedAt),
    generatedImageId: firstString(record.generatedImageId),
    product: {
      ...nested,
      status,
      title:
        firstString(record.title, nested.title) ?? nested.title,
      errorMessage:
        status === "failed"
          ? firstString(record.errorMessage, nested.errorMessage)
          : undefined,
      adminUrl: nested.adminUrl ?? firstString(record.adminUrl),
      shopifyProductId:
        nested.shopifyProductId ?? firstString(record.shopifyProductId),
    },
  };
}

export function summarizeProductList(
  products: ShopifyUploadProductResult[],
): ShopifyUserStatus {
  if (!products.length) return "none";
  let ok = 0;
  let fail = 0;
  for (const p of products) {
    const d = productResultToDisplay(p);
    if (d.status === "success") ok += 1;
    else fail += 1;
  }
  if (fail === 0) return "success";
  if (ok === 0) return "failed";
  return "partial";
}

export function summarizeHistoryList(
  rows: ShopifyUploadHistoryRecord[],
): ShopifyUserStatus {
  if (!rows.length) return "none";
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    if (r.success === false) fail += 1;
    else ok += 1;
  }
  if (fail === 0) return "success";
  if (ok === 0) return "failed";
  return "partial";
}

export function statusLabel(status: ShopifyUserStatus): string {
  switch (status) {
    case "success":
      return "Uploaded";
    case "failed":
      return "Failed";
    case "partial":
      return "Partly uploaded";
    default:
      return "Not uploaded";
  }
}

export function statusHint(status: ShopifyUserStatus): string {
  switch (status) {
    case "success":
      return "Sent to Shopify successfully. Click for details.";
    case "failed":
      return "Upload had problems. Click to see what went wrong.";
    case "partial":
      return "Some products uploaded, some failed. Click for details.";
    default:
      return "Not sent to Shopify yet.";
  }
}

export function uploadResponseProducts(
  res: ShopifyUploadMultipleResponse | null | undefined,
): ShopifyUploadProductResult[] {
  if (!res || !Array.isArray(res.data)) return [];
  return res.data;
}
