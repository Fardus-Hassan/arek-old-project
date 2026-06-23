type CsvRow = { key: string; value: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toDisplayString(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function walk(value: unknown, prefix: string, out: CsvRow[]): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push({ key: prefix, value: "" });
      return;
    }
    value.forEach((item, idx) => {
      walk(item, `${prefix}[${idx}]`, out);
    });
    return;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      out.push({ key: prefix, value: "" });
      return;
    }
    for (const [k, v] of entries) {
      const next = prefix ? `${prefix}.${k}` : k;
      walk(v, next, out);
    }
    return;
  }

  out.push({ key: prefix, value: toDisplayString(value) });
}

function escapeCsvCell(s: string): string {
  // RFC4180-ish: quote if contains comma, quote, CR/LF
  const needs = /[",\r\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

/**
 * Flattens any nested JSON into a two-column CSV: key,value
 * - keys use dot-notation and [index] for arrays
 * - ensures no data is omitted (best-effort stringify for unknown types)
 */
export function flattenJsonToKeyValueCsv(
  root: unknown,
  opts?: { includeBom?: boolean },
): string {
  const rows: CsvRow[] = [];
  walk(root, "", rows);

  const header = "key,value";
  const body = rows
    .filter((r) => r.key !== "")
    .map((r) => `${escapeCsvCell(r.key)},${escapeCsvCell(r.value ?? "")}`)
    .join("\n");

  const csv = `${header}\n${body}\n`;
  return opts?.includeBom ? `\uFEFF${csv}` : csv;
}

function isPrimitive(v: unknown): v is string | number | boolean | null | undefined {
  return (
    v == null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  );
}

function toHumanValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Avoid embedding JSON blobs in CSV values.
  // Non-primitive values should be expanded into rows by the caller.
  return "";
}

/**
 * Human-friendly CSV:
 * - keeps JSON key paths (dot notation)
 * - keeps arrays in ONE cell when possible (joined by " | ")
 * - stringifies complex objects/arrays so humans can read the full content
 * - adds `raw_json` row as last line to guarantee nothing is omitted
 */
export function jsonToHumanReadableCsv(
  root: unknown,
  opts?: { includeBom?: boolean; includeRawJsonRow?: boolean },
): string {
  const rows: CsvRow[] = [];

  const walkHuman = (value: unknown, prefix: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        rows.push({ key: prefix, value: "" });
        return;
      }

      // If array is primitives -> join into one cell
      if (value.every(isPrimitive)) {
        const joined = value.map(toHumanValue).join(" | ");
        rows.push({ key: prefix, value: joined });
        return;
      }

      // Otherwise stringify the whole array into one cell for readability
      rows.push({ key: prefix, value: toHumanValue(value) });
      return;
    }

    if (isPlainObject(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        rows.push({ key: prefix, value: "" });
        return;
      }
      for (const [k, v] of entries) {
        const next = prefix ? `${prefix}.${k}` : k;
        walkHuman(v, next);
      }
      return;
    }

    rows.push({ key: prefix, value: toHumanValue(value) });
  };

  walkHuman(root, "");

  if (opts?.includeRawJsonRow !== false) {
    rows.push({ key: "raw_json", value: toHumanValue(root) });
  }

  const header = "key,value";
  const body = rows
    .filter((r) => r.key !== "")
    .map((r) => `${escapeCsvCell(r.key)},${escapeCsvCell(r.value ?? "")}`)
    .join("\n");

  const csv = `${header}\n${body}\n`;
  return opts?.includeBom ? `\uFEFF${csv}` : csv;
}

type SectionedRow = { section: string; path: string; value: string };

function deriveSection(path: string): string {
  // Group common AI response paths into human-friendly sections.
  if (path === "id" || path === "userId" || path === "isDeleted" || path === "createdAt" || path === "updatedAt") {
    return "Document";
  }
  if (path.startsWith("aiGenerated.status") || path.startsWith("aiGenerated.message") || path.startsWith("aiGenerated.product_id")) {
    return "AI Run";
  }
  if (path.startsWith("aiGenerated.product.")) {
    const rest = path.slice("aiGenerated.product.".length);
    if (rest.startsWith("images_batch[")) {
      const m = rest.match(/^images_batch\[(\d+)\]\.(.+)$/);
      if (m) {
        const idx = m[1];
        const tail = m[2];
        if (tail.startsWith("generated_skus.")) return `Image Batch #${idx} · SKUs`;
        if (tail.endsWith("_url") || tail.endsWith("_urls") || tail.includes("_url") || tail.includes("_urls"))
          return `Image Batch #${idx} · URLs`;
        if (tail.startsWith("dimensions.")) return `Image Batch #${idx} · Dimensions`;
        if (tail.startsWith("listing.")) return `Image Batch #${idx} · Listing`;
        if (tail.startsWith("product_details.")) return `Image Batch #${idx} · Product Details`;
        if (tail.startsWith("variant_data.")) return `Image Batch #${idx} · Variant Data`;
        if (tail.startsWith("selected_features")) return `Image Batch #${idx} · Selected Features`;
        if (tail.startsWith("tags") || tail.startsWith("seo_tags") || tail.includes(".tags")) return `Image Batch #${idx} · Tags`;
        if (tail.startsWith("key_features")) return `Image Batch #${idx} · Key Features`;
        return `Image Batch #${idx}`;
      }
      return "Images Batch";
    }
    return "Product";
  }
  if (path === "sku" || path === "price" || path === "activeTabIndex") return "UI Inputs";
  if (path === "raw_json") return "Raw";
  return "Other";
}

/**
 * Human-friendly CSV for reading AI output:
 * - 3 columns: section, path, value
 * - arrays of primitives joined with " | "
 * - complex arrays/objects stringified
 * - keeps `path` matching JSON key paths for cross-checking
 * - optional `raw_json` row to ensure nothing is lost
 */
export function jsonToSectionedReadableCsv(
  root: unknown,
  opts?: { includeBom?: boolean; includeRawJsonRow?: boolean },
): string {
  const rows: SectionedRow[] = [];

  const add = (path: string, value: unknown) => {
    const section = deriveSection(path);
    rows.push({ section, path, value: toHumanValue(value) });
  };

  const walk = (value: unknown, prefix: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        add(prefix, "");
        return;
      }
      if (value.every(isPrimitive)) {
        add(prefix, value.map(toHumanValue).join(" | "));
        return;
      }
      // keep whole array readable in one cell
      add(prefix, value);
      return;
    }
    if (isPlainObject(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        add(prefix, "");
        return;
      }
      for (const [k, v] of entries) {
        const next = prefix ? `${prefix}.${k}` : k;
        walk(v, next);
      }
      return;
    }
    add(prefix, value);
  };

  walk(root, "");

  if (opts?.includeRawJsonRow !== false) {
    rows.push({ section: "Raw", path: "raw_json", value: toHumanValue(root) });
  }

  const header = "section,path,value";
  const body = rows
    .filter((r) => r.path !== "")
    .map((r) => `${escapeCsvCell(r.section)},${escapeCsvCell(r.path)},${escapeCsvCell(r.value ?? "")}`)
    .join("\n");

  const csv = `${header}\n${body}\n`;
  return opts?.includeBom ? `\uFEFF${csv}` : csv;
}

function titleCaseLabel(s: string): string {
  return s
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function lastPathSegment(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}

function friendlyFieldLabel(path: string): string {
  // Strip common prefixes for readability
  let p = path;
  p = p.replace(/^aiGenerated\.product\./, "");
  p = p.replace(/^aiGenerated\./, "");

  // Remove array indices for label; index is handled in section names
  p = p.replace(/\[\d+\]/g, "");

  // Keep only the last segment (field name), but preserve a bit of context for common collisions
  const seg = lastPathSegment(p);
  return titleCaseLabel(seg);
}

function sectionOrder(section: string): number {
  if (section === "Document") return 1;
  if (section === "AI Run") return 2;
  if (section === "Product") return 3;
  if (section.startsWith("Image Batch #")) return 4;
  if (section === "UI Inputs") return 98;
  if (section === "Raw") return 99;
  return 50;
}

/**
 * Non‑technical friendly CSV:
 * - 3 columns: Section, Field, Value
 * - no dot-paths shown; field names are title-cased
 * - arrays of primitives become comma-separated lists
 * - complex objects/arrays are stringified (still readable)
 * - optional Advanced/Raw section (off by default)
 */
export function jsonToNonTechReadableCsv(
  root: unknown,
  opts?: { includeBom?: boolean; includeAdvancedRaw?: boolean },
): string {
  const rows: { section: string; field: string; value: string; sortKey: string }[] =
    [];

  const toPlainText = (v: unknown): string => {
    if (v === null) return "null";
    if (v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return "";
  };

  const friendlyFieldLabelFromPath = (path: string): string => {
    // Keep some context but avoid JSON-like paths.
    let p = path;
    p = p.replace(/^aiGenerated\.product\./, "");
    p = p.replace(/^aiGenerated\./, "");

    // Replace array indices with human numbering
    p = p.replace(/\[(\d+)\]/g, (_, n) => ` (Item ${Number(n) + 1})`);

    // Turn dot path into " > " breadcrumbs
    const segs = p.split(".").filter(Boolean);
    const label = segs.map((s) => titleCaseLabel(s)).join(" > ");
    return label || titleCaseLabel(path);
  };

  const add = (path: string, value: unknown) => {
    const section = deriveSection(path);
    const field = friendlyFieldLabelFromPath(path);

    // Make lists friendlier for non-tech readers
    let v: string;
    if (Array.isArray(value) && value.every(isPrimitive)) {
      v = value
        .map((x) => (x == null ? "" : toPlainText(x)))
        .filter(Boolean)
        .join(", ");
    } else {
      v = toPlainText(value);
    }

    rows.push({
      section,
      field,
      value: v,
      sortKey: path,
    });
  };

  const walk = (value: unknown, prefix: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        add(prefix, "");
        return;
      }
      // primitives -> single row joined
      if (value.every(isPrimitive)) {
        add(prefix, value);
        return;
      }
      // array of objects -> expand each item
      value.forEach((item, idx) => {
        const next = `${prefix}[${idx}]`;
        walk(item, next);
      });
      return;
    }
    if (isPlainObject(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        add(prefix, "");
        return;
      }
      for (const [k, v] of entries) {
        const next = prefix ? `${prefix}.${k}` : k;
        walk(v, next);
      }
      return;
    }
    add(prefix, value);
  };

  walk(root, "");

  // Remove empty placeholder root key if any slipped in
  const cleaned = rows.filter((r) => r.field !== "" && r.section !== "Other");

  // Sort by section, then stable by path
  cleaned.sort((a, b) => {
    const sa = sectionOrder(a.section);
    const sb = sectionOrder(b.section);
    if (sa !== sb) return sa - sb;
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.sortKey.localeCompare(b.sortKey);
  });

  if (opts?.includeAdvancedRaw) {
    cleaned.push({
      section: "Advanced",
      field: "Raw JSON",
      value: "",
      sortKey: "raw_json",
    });
  }

  // User requested: remove Section column and also remove section info.
  const header = "Field,Value";
  const body = cleaned
    .filter((r) => r.section && r.field)
    .map(
      (r) =>
        `${escapeCsvCell(r.field)},${escapeCsvCell(r.value ?? "")}`,
    )
    .join("\n");

  const csv = `${header}\n${body}\n`;
  return opts?.includeBom ? `\uFEFF${csv}` : csv;
}

