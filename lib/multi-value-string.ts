/** Join selected values for storage / CSV: `a; b; c` (no trailing semicolon). */
export function joinMultiValues(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("; ");
}

/** Parse stored / CSV multi-value strings (semicolon or legacy comma). */
export function parseMultiValues(raw: string | undefined | null): string[] {
  if (raw == null) return [];
  const t = String(raw).trim();
  if (!t || t === "—") return [];
  if (t.includes(";")) {
    return t
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function displayMultiValue(raw: string | undefined | null): string {
  const parts = parseMultiValues(raw);
  if (!parts.length) return "—";
  return joinMultiValues(parts);
}
