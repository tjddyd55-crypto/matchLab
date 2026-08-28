/** 파일명 날짜 스탬프 YYYY-MM-DD */
export function ymdFileStamp(d = new Date(), sep = "-"): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${sep}${m}${sep}${day}`;
}

export function sanitizeExcelFilenamePart(raw: string): string {
  return raw
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}
