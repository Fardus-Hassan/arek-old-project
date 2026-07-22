import { NextRequest, NextResponse } from "next/server";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

type UploadItem = {
  url: string;
  filename?: string;
};

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : "file.csv";
  } catch {
    return "file.csv";
  }
}

function isAllowedRemoteUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".amazonaws.com") ||
      host.includes("aisizepro") ||
      host.includes("ajpropl")
    );
  } catch {
    return false;
  }
}

/**
 * Server-side proxy for saved-files → Shopify upload.
 * Avoids browser CORS when fetching CSV from S3.
 *
 * POST JSON: { items: [{ url, filename? }] }
 * Header: Authorization: Bearer <token> (forwarded to backend)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { items?: UploadItem[] };
  try {
    body = (await req.json()) as { items?: UploadItem[] };
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json(
      { success: false, message: "Select at least one file to upload." },
      { status: 400 },
    );
  }

  const formData = new FormData();

  try {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]!;
      const url = String(item.url ?? "").trim();
      if (!url || !isAllowedRemoteUrl(url)) {
        return NextResponse.json(
          { success: false, message: `Blocked or invalid file URL (#${i + 1})` },
          { status: 400 },
        );
      }

      const remote = await fetch(url, { method: "GET", cache: "no-store" });
      if (!remote.ok) {
        return NextResponse.json(
          {
            success: false,
            message: `Failed to download file (#${i + 1}): ${remote.status}`,
          },
          { status: 502 },
        );
      }

      const buf = await remote.arrayBuffer();
      const rawName =
        (item.filename && item.filename.trim()) || filenameFromUrl(url);
      const name = rawName.toLowerCase().endsWith(".csv")
        ? rawName
        : `${rawName.replace(/\.+$/, "")}.csv`;

      formData.append(
        "files",
        new File([buf], name, { type: "text/csv;charset=utf-8" }),
      );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch remote CSV files";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }

  try {
    const upstream = await fetch(`${apiBase}/shopify/upload-multiple-csv`, {
      method: "POST",
      headers: { Authorization: auth },
      body: formData,
    });

    const text = await upstream.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { success: upstream.ok, message: text || upstream.statusText };
    }

    return NextResponse.json(json, { status: upstream.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Shopify upload request failed";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
