const FIELD_ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export function slugFromFieldLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function ensureValidFieldIdBase(raw: string): string {
  let base = raw.trim().toLowerCase();
  if (base === "") return "field";
  if (!/^[a-z]/.test(base)) base = `field_${base}`;
  base = base.slice(0, 64);
  return FIELD_ID_PATTERN.test(base) ? base : "field";
}

export function genFieldIdFromLabel(
  label: string,
  existing: ReadonlySet<string>,
): string {
  const base = ensureValidFieldIdBase(slugFromFieldLabel(label));
  if (!existing.has(base)) return base;
  for (let i = 2; i < 200; i += 1) {
    const candidate = `${base}_${i}`.slice(0, 64);
    if (FIELD_ID_PATTERN.test(candidate) && !existing.has(candidate)) {
      return candidate;
    }
  }
  return `field_${Date.now().toString(36)}`.slice(0, 64);
}
