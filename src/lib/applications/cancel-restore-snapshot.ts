import { ApplicationStatus } from "@/generated/prisma";

export const CANCEL_RESTORE_SNAPSHOT_KEY = "_matchonCancelRestore";

export type CancelRestoreSnapshot = {
  previousStatus: typeof ApplicationStatus.pending | typeof ApplicationStatus.approved;
  source: "organizer" | "gym";
  at: string;
};

export function readCancelRestoreSnapshot(
  agreement: unknown,
): CancelRestoreSnapshot | null {
  if (!agreement || typeof agreement !== "object" || Array.isArray(agreement)) {
    return null;
  }
  const raw = (agreement as Record<string, unknown>)[CANCEL_RESTORE_SNAPSHOT_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const previousStatus = row.previousStatus;
  const source = row.source;
  if (
    previousStatus !== ApplicationStatus.pending &&
    previousStatus !== ApplicationStatus.approved
  ) {
    return null;
  }
  if (source !== "organizer" && source !== "gym") return null;
  return {
    previousStatus,
    source,
    at: typeof row.at === "string" ? row.at : new Date(0).toISOString(),
  };
}

export function withCancelRestoreSnapshot(
  agreement: unknown,
  snapshot: CancelRestoreSnapshot,
): Record<string, unknown> {
  const base =
    agreement && typeof agreement === "object" && !Array.isArray(agreement)
      ? { ...(agreement as Record<string, unknown>) }
      : {};
  base[CANCEL_RESTORE_SNAPSHOT_KEY] = snapshot;
  return base;
}

export function clearCancelRestoreSnapshot(
  agreement: unknown,
): Record<string, unknown> | null {
  if (!agreement || typeof agreement !== "object" || Array.isArray(agreement)) {
    return null;
  }
  const next = { ...(agreement as Record<string, unknown>) };
  delete next[CANCEL_RESTORE_SNAPSHOT_KEY];
  return next;
}

/** 스냅샷이 없을 때 복구 대상 status 추정 (과거 취소 건 호환) */
export function inferRestoreStatus(input: {
  paymentStatus: string;
  creditRefundedAt: Date | null;
  creditChargeAmount: number;
  checkInStatus: string;
  weighInStatus: string;
}): typeof ApplicationStatus.pending | typeof ApplicationStatus.approved {
  if (input.creditRefundedAt || input.creditChargeAmount > 0) {
    return ApplicationStatus.approved;
  }
  if (input.paymentStatus === "paid" || input.paymentStatus === "waived") {
    return ApplicationStatus.approved;
  }
  if (input.checkInStatus !== "pending" || input.weighInStatus !== "pending") {
    return ApplicationStatus.approved;
  }
  return ApplicationStatus.pending;
}
