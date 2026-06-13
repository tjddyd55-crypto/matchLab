import { Prisma } from "@/generated/prisma";
import {
  actionFailure,
  type ActionFailure,
} from "@/lib/action-result";

/** Prisma 오류 → UI 처리 가능한 ActionFailure (해당 없으면 null) */
export function prismaErrorToActionFailure(error: unknown): ActionFailure | null {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return actionFailure(
      "VALIDATION_ERROR",
      "저장 데이터 형식이 올바르지 않습니다. 입력값을 확인해 주세요.",
    );
  }

  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (error.code) {
    case "P2022":
      return actionFailure(
        "INTERNAL",
        "데이터베이스 스키마가 최신이 아닙니다. 관리자에게 스키마 반영(db:push)을 요청해 주세요.",
      );
    case "P2021":
      return actionFailure(
        "INTERNAL",
        "데이터베이스 테이블이 준비되지 않았습니다. 관리자에게 스키마 반영(db:push)을 요청해 주세요.",
      );
    default:
      return null;
  }
}

/** Prisma unique constraint (P2002) 여부 */
export function isPrismaUniqueViolation(
  error: unknown,
  target?: string,
): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  if (!target) return true;
  const meta = error.meta;
  if (!meta || typeof meta !== "object") return false;
  const t = (meta as { target?: unknown }).target;
  if (Array.isArray(t)) {
    return t.some((x) => String(x).includes(target));
  }
  if (typeof t === "string") {
    return t.includes(target);
  }
  return false;
}
