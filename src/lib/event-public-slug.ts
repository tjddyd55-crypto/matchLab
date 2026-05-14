import { randomBytes } from "node:crypto";

/**
 * 공개 URL용 `publicSlug` — ASCII 가 없으면 `event` 접두 + 랜덤 suffix 로 고유성 보장.
 */
export function buildPublicSlugBaseFromTitle(title: string): string {
  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return ascii.length >= 3 ? ascii : "event";
}

export async function allocateUniquePublicSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = buildPublicSlugBaseFromTitle(title);
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = randomBytes(4).toString("hex");
    const candidate =
      attempt === 0 ? `${base}-${suffix}` : `${base}-${suffix}-${attempt}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("publicSlug 할당에 실패했습니다.");
}
