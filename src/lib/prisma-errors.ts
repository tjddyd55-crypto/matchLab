import { Prisma } from "@/generated/prisma";

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
