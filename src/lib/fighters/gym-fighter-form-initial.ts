/**
 * Gym fighter edit form initial mapper — server/client 공용.
 * "use client" 모듈에 두면 Server Component에서 호출 시 Production 500이 난다.
 */
import { toDateInputValue } from "@/lib/date-only";
import type { FighterStatus } from "@/lib/enums";

export type GymFighterFormInitialValues = {
  name: string;
  birthDate: string;
  gender: string;
  phone: string;
  height: string;
  weight: string;
  primarySport: string;
  guardianName: string;
  guardianPhone: string;
  gymInternalMemo: string;
  status?: FighterStatus;
};

export function gymFighterFormInitialFromEdit(row: {
  name: string;
  birthDate: Date | string | null;
  gender: string | null;
  phone: string | null;
  height: number | null;
  weight: number | null;
  primarySport: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  gymInternalMemo: string | null;
  status: FighterStatus;
}): GymFighterFormInitialValues {
  return {
    name: row.name ?? "",
    birthDate: toDateInputValue(row.birthDate),
    gender: row.gender ?? "",
    phone: row.phone ?? "",
    height: row.height != null ? String(row.height) : "",
    weight: row.weight != null ? String(row.weight) : "",
    primarySport: row.primarySport ?? "",
    guardianName: row.guardianName ?? "",
    guardianPhone: row.guardianPhone ?? "",
    gymInternalMemo: row.gymInternalMemo ?? "",
    status: row.status,
  };
}
