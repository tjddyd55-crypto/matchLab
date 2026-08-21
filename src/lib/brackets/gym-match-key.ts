import type { AutoMatchCandidate } from "@/lib/brackets/auto-match";

/** 체육관 동일 여부 — 표시명 우선, 없으면 gymId */
export function normalizeGymName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * 동일 체육관 판별 키.
 * 표시 체육관명이 있으면 이름을 우선한다.
 * Excel/외부등록은 공용 placeholder gymId를 공유하므로 gymId만 보면
 * 서로 다른 체육관 선수도 같은 체육관으로 오인된다.
 */
export function gymMatchKey(
  gymId: string | null | undefined,
  gymName: string,
): string {
  const name = normalizeGymName(gymName);
  if (name && name !== "—" && name !== "-") {
    return `name:${name}`;
  }
  const id = (gymId ?? "").trim();
  if (id) return `id:${id}`;
  return "unknown";
}

export function isSameGym(
  a: Pick<AutoMatchCandidate, "gymId" | "gymName">,
  b: Pick<AutoMatchCandidate, "gymId" | "gymName">,
): boolean {
  return gymMatchKey(a.gymId, a.gymName) === gymMatchKey(b.gymId, b.gymName);
}
