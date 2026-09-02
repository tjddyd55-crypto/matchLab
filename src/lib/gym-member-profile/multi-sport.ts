/**
 * Gym / Application / Member ↔ MemberSportTemplate many-to-many helpers.
 * Legacy Gym.memberSportTemplateId is compatibility-only — not SSOT.
 */

export type GymSportTemplateOption = {
  id: string;
  code: string;
  name: string;
  sportType: string;
  active: boolean;
};

export function dedupeTemplateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
