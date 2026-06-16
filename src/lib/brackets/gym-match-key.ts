import type { AutoMatchCandidate } from "@/lib/brackets/auto-match";

/** 체육관 동일 여부 — gymId 우선, 없으면 정규화된 gymName */
export function normalizeGymName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

export function gymMatchKey(gymId: string, gymName: string): string {
  if (gymId.trim()) return `id:${gymId.trim()}`;
  return `name:${normalizeGymName(gymName)}`;
}

export function isSameGym(a: AutoMatchCandidate, b: AutoMatchCandidate): boolean {
  return gymMatchKey(a.gymId, a.gymName) === gymMatchKey(b.gymId, b.gymName);
}
